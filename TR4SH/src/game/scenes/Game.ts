import { Scene } from "phaser";

export class Game extends Scene {
    private client: any;
    private room: any;
    private playerGraphics: Map<string, Phaser.GameObjects.Graphics>;
    private playerSquares: Map<string, Phaser.GameObjects.Rectangle>;
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private gameOverShown: boolean = false;
    private waitingText!: Phaser.GameObjects.Text;
    private countdownText!: Phaser.GameObjects.Text;
    private resultText?: Phaser.GameObjects.Text;

    constructor() {
        super("Game");
        this.playerGraphics = new Map();
        this.playerSquares = new Map();
    }

    init() {
        console.log("Game scene init - resetting state");
        this.gameOverShown = false;
        this.playerGraphics.clear();
        this.playerSquares.clear();

        if (this.room) {
            try {
                this.room.leave();
            } catch (e) {
                console.log("Error leaving old room:", e);
            }
            this.room = null;
        }
    }

    async create() {
        console.log("Game scene create - starting fresh");

        this.cameras.main.setBackgroundColor(0x000000);

        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
        }

        const border = this.add.graphics();
        border.lineStyle(4, 0xffffff, 1);
        border.strokeRect(10, 10, 1004, 748);

        this.waitingText = this.add
            .text(512, 384, "Connecting to server...", {
                fontSize: "32px",
                color: "#FFFFFF",
                align: "center",
            })
            .setOrigin(0.5);

        try {
            // Dynamic import - only loads on client side
            const ColyseusModule = await import("colyseus.js");
            const Colyseus = ColyseusModule.default || ColyseusModule;

            this.client = new Colyseus.Client("ws://localhost:2567");
            this.room = await this.client.joinOrCreate("tron");

            console.log("Connected to new room successfully!");
            this.waitingText.setText("Waiting for another player...");

            this.setupRoomListeners();
        } catch (e) {
            console.error("Connection failed:", e);
            this.waitingText.setText(
                "Failed to connect!\n\nMake sure server is running:\nnpm run server"
            );
            this.waitingText.setColor("#FF0000");
        }
    }

    setupRoomListeners() {
        this.room.onMessage("gameReady", () => {
            console.log("Game ready! Starting countdown...");
            if (this.waitingText) {
                this.waitingText.destroy();
            }

            this.countdownText = this.add
                .text(512, 384, "3", {
                    fontSize: "64px",
                    color: "#00FF00",
                    stroke: "#000000",
                    strokeThickness: 8,
                })
                .setOrigin(0.5);

            let count = 3;
            const countdown = setInterval(() => {
                count--;
                if (count > 0) {
                    this.countdownText.setText(count.toString());
                } else {
                    this.countdownText.setText("GO!");
                    setTimeout(() => {
                        if (this.countdownText) {
                            this.countdownText.destroy();
                        }
                    }, 500);
                    clearInterval(countdown);
                }
            }, 1000);
        });

        this.room.onStateChange((state: any) => {
            console.log("State changed", {
                gameStarted: state.gameStarted,
                winner: state.winner,
                isDraw: state.isDraw,
                playersCount: state.players.size,
            });
        });
    }

    update() {
        if (!this.room || !this.cursors || !this.room.state) return;

        if (this.room.state.players) {
            this.room.state.players.forEach(
                (player: any, sessionId: string) => {
                    if (!this.playerGraphics.has(sessionId)) {
                        const graphics = this.add.graphics();
                        this.playerGraphics.set(sessionId, graphics);
                    }

                    if (!this.playerSquares.has(sessionId)) {
                        const color = parseInt(player.color.replace("#", "0x"));
                        const square = this.add.rectangle(
                            player.x,
                            player.y,
                            10,
                            10,
                            color
                        );
                        this.playerSquares.set(sessionId, square);
                    }

                    this.drawPlayer(sessionId, player);
                }
            );

            const gameEnded =
                this.room.state.isDraw ||
                (this.room.state.winner && this.room.state.winner !== "");

            if (gameEnded && !this.gameOverShown) {
                console.log("Game ended detected!", {
                    isDraw: this.room.state.isDraw,
                    winner: this.room.state.winner,
                });
                this.gameOverShown = true;
                this.showGameResult();
            }
        }

        if (
            this.room.state &&
            this.room.state.gameStarted &&
            !this.gameOverShown
        ) {
            if (this.cursors.up.isDown) {
                this.room.send("keypress", { key: "ArrowUp" });
            } else if (this.cursors.down.isDown) {
                this.room.send("keypress", { key: "ArrowDown" });
            } else if (this.cursors.left.isDown) {
                this.room.send("keypress", { key: "ArrowLeft" });
            } else if (this.cursors.right.isDown) {
                this.room.send("keypress", { key: "ArrowRight" });
            }
        }
    }

    showGameResult() {
        console.log("Showing game result...");

        const myPlayer = this.room.state.players.get(this.room.sessionId);

        let text = "";
        let color = "";

        if (this.room.state.isDraw) {
            text = "DRAW!";
            color = "#FFFF00";
            console.log("Result: DRAW");
        } else {
            const imAlive = myPlayer && myPlayer.alive;
            if (imAlive) {
                text = "YOU WIN!";
                color = "#00FF00";
                console.log("Result: WIN");
            } else {
                text = "YOU LOSE!";
                color = "#FF0000";
                console.log("Result: LOSE");
            }
        }

        if (this.resultText) {
            this.resultText.destroy();
        }

        this.resultText = this.add
            .text(512, 384, text, {
                fontSize: "64px",
                color: color,
                stroke: "#000000",
                strokeThickness: 8,
            })
            .setOrigin(0.5)
            .setDepth(100);

        this.time.delayedCall(3000, () => {
            console.log("Transitioning to GameOver scene...");

            const won = myPlayer && myPlayer.alive && !this.room.state.isDraw;
            const draw = this.room.state.isDraw;

            if (this.room) {
                this.room.leave();
            }

            this.scene.start("GameOver", { won: won, draw: draw });
        });
    }

    drawPlayer(sessionId: string, player: any) {
        const graphics = this.playerGraphics.get(sessionId);
        const square = this.playerSquares.get(sessionId);

        if (!graphics || !square) return;

        square.setPosition(player.x, player.y);
        square.setVisible(player.alive);

        graphics.clear();
        const color = parseInt(player.color.replace("#", "0x"));
        graphics.lineStyle(5, color, 0.8);

        for (let i = 0; i < player.trail.length - 2; i += 2) {
            graphics.lineBetween(
                player.trail[i],
                player.trail[i + 1],
                player.trail[i + 2],
                player.trail[i + 3]
            );
        }
    }

    shutdown() {
        console.log("Game scene shutting down");

        if (this.room) {
            try {
                this.room.leave();
            } catch (e) {
                console.log("Error leaving room on shutdown:", e);
            }
        }

        if (this.resultText) {
            this.resultText.destroy();
            this.resultText = undefined;
        }

        if (this.waitingText) {
            this.waitingText.destroy();
        }

        if (this.countdownText) {
            this.countdownText.destroy();
        }

        this.playerGraphics.forEach((graphic) => graphic.destroy());
        this.playerSquares.forEach((square) => square.destroy());

        this.playerGraphics.clear();
        this.playerSquares.clear();
    }
}

