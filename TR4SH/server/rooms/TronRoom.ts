import { Room, Client } from "colyseus";
import { Schema, type, MapSchema, ArraySchema } from "@colyseus/schema";

class Player extends Schema {
    @type("number") x: number;
    @type("number") y: number;
    @type("number") direction: number;
    @type("boolean") alive: boolean = true;
    @type("string") color: string;
    @type(["number"]) trail = new ArraySchema<number>();
}

class TronState extends Schema {
    @type({ map: Player }) players = new MapSchema<Player>();
    @type("string") winner: string = "";
    @type("boolean") gameStarted: boolean = false;
    @type("boolean") isDraw: boolean = false;
}

export class TronRoom extends Room<TronState> {
    maxClients = 2;
    private gameSpeed = 60;
    private gameInterval: NodeJS.Timeout;
    private gridSize = 7;

    onCreate(options: any) {
        this.setState(new TronState());
        this.setPrivate(false);

        this.onMessage("keypress", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player && player.alive && this.state.gameStarted) {
                this.handlePlayerInput(player, message.key);
            }
        });
    }

    onJoin(client: Client) {
        console.log(`Player ${client.sessionId} joined`);

        const colors = ["#FF0000", "#0000FF"];
        const startPositions = [
            { x: 200, y: 384 },
            { x: 824, y: 384 },
        ];

        const playerIndex = this.state.players.size;
        const player = new Player();
        player.x = startPositions[playerIndex].x;
        player.y = startPositions[playerIndex].y;
        player.direction = playerIndex === 0 ? 1 : 3;
        player.color = colors[playerIndex];
        player.trail.push(player.x, player.y);

        this.state.players.set(client.sessionId, player);

        if (this.state.players.size === 2) {
            console.log("2 players connected, starting game!");
            this.broadcast("gameReady");

            setTimeout(() => {
                this.startGame();
            }, 3000);
        }
    }

    startGame() {
        this.state.gameStarted = true;
        console.log("Game started!");

        this.gameInterval = setInterval(() => {
            this.updateGame();
        }, this.gameSpeed);
    }

    updateGame() {
        // Calculate next positions for all players
        const nextPositions: Map<string, { x: number; y: number }> = new Map();
        const collisions: Set<string> = new Set();

        this.state.players.forEach((player, sessionId) => {
            if (!player.alive) return;

            let nextX = player.x;
            let nextY = player.y;

            switch (player.direction) {
                case 0:
                    nextY -= this.gridSize;
                    break;
                case 1:
                    nextX += this.gridSize;
                    break;
                case 2:
                    nextY += this.gridSize;
                    break;
                case 3:
                    nextX -= this.gridSize;
                    break;
            }

            nextPositions.set(sessionId, { x: nextX, y: nextY });
        });

        // Check collisions BEFORE moving
        this.state.players.forEach((player, sessionId) => {
            if (!player.alive) return;

            const nextPos = nextPositions.get(sessionId)!;

            // Wall collision
            if (
                nextPos.x < 20 ||
                nextPos.x > 1004 ||
                nextPos.y < 20 ||
                nextPos.y > 748
            ) {
                collisions.add(sessionId);
                console.log(
                    `${sessionId} will hit wall at (${nextPos.x}, ${nextPos.y})`
                );
                return;
            }

            // Trail collision - check against ALL trails including opponent's
            this.state.players.forEach((otherPlayer, otherSessionId) => {
                // For own trail, skip recent positions (last 10 to avoid self-collision at start)
                const skipPositions = sessionId === otherSessionId ? 10 : 0;
                const trailLength = otherPlayer.trail.length;

                for (let i = 0; i < trailLength - skipPositions * 2; i += 2) {
                    const trailX = otherPlayer.trail[i];
                    const trailY = otherPlayer.trail[i + 1];

                    // Precise collision detection - within 3 pixels
                    const distance = Math.sqrt(
                        Math.pow(nextPos.x - trailX, 2) +
                            Math.pow(nextPos.y - trailY, 2)
                    );

                    if (distance < 3) {
                        collisions.add(sessionId);
                        console.log(
                            `${sessionId} will hit trail at (${nextPos.x}, ${nextPos.y}), trail point: (${trailX}, ${trailY})`
                        );
                        return;
                    }
                }
            });
        });

        // Check for head-on collision
        if (nextPositions.size === 2) {
            const sessionIds = Array.from(nextPositions.keys());
            const pos1 = nextPositions.get(sessionIds[0])!;
            const pos2 = nextPositions.get(sessionIds[1])!;

            const distance = Math.sqrt(
                Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
            );

            if (distance < this.gridSize) {
                console.log("Head-on collision!");
                collisions.add(sessionIds[0]);
                collisions.add(sessionIds[1]);
            }
        }

        // Mark collided players as dead IMMEDIATELY - don't move them
        collisions.forEach((sessionId) => {
            const player = this.state.players.get(sessionId);
            if (player) {
                player.alive = false;
                console.log(`Player ${sessionId} CRASHED!`);
            }
        });

        // Move ONLY alive players
        let alivePlayers = 0;
        let aliveSessionId = "";

        this.state.players.forEach((player, sessionId) => {
            if (player.alive) {
                const nextPos = nextPositions.get(sessionId)!;
                player.x = nextPos.x;
                player.y = nextPos.y;
                player.trail.push(player.x, player.y);

                alivePlayers++;
                aliveSessionId = sessionId;
            }
        });

        // End game immediately if someone died
        if (alivePlayers === 0) {
            console.log("Both players dead - DRAW!");
            this.state.isDraw = true;
            this.endGame("");
        } else if (alivePlayers === 1) {
            console.log(`Winner: ${aliveSessionId}`);
            this.endGame(aliveSessionId);
        }
    }

    handlePlayerInput(player: Player, key: string) {
        const dirMap: Record<string, number> = {
            ArrowUp: 0,
            ArrowRight: 1,
            ArrowDown: 2,
            ArrowLeft: 3,
        };

        const newDir = dirMap[key];
        if (newDir !== undefined && Math.abs(newDir - player.direction) !== 2) {
            player.direction = newDir;
        }
    }

    endGame(winnerSessionId: string) {
        clearInterval(this.gameInterval);
        this.state.winner = winnerSessionId;

        if (this.state.isDraw) {
            console.log("Game over! It's a draw!");
        } else {
            console.log(`Game over! Winner: ${winnerSessionId}`);
        }

        setTimeout(() => {
            this.disconnect();
        }, 5000);
    }

    onLeave(client: Client) {
        console.log(`Player ${client.sessionId} left`);
        const player = this.state.players.get(client.sessionId);
        if (player && this.state.gameStarted) {
            player.alive = false;
        }
    }

    onDispose() {
        console.log("Room disposed");
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
        }
    }
}
