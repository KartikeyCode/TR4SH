import { Scene } from "phaser";

export class GameOver extends Scene {
    constructor() {
        super("GameOver");
    }

    create(data: { won: boolean; draw: boolean }) {
        this.cameras.main.setBackgroundColor(0x000000);

        const won = data.won || false;
        const draw = data.draw || false;

        let titleColor = "#FF0000";
        let titleText = "GAME OVER";
        let message = "Better luck next time!";

        if (draw) {
            titleColor = "#FFFF00";
            titleText = "DRAW!";
            message = "You both crashed!";
        } else if (won) {
            titleColor = "#00FF00";
            titleText = "VICTORY!";
            message = "You defeated your opponent!";
        }

        this.add
            .text(512, 250, titleText, {
                fontFamily: "Arial Black",
                fontSize: "64px",
                color: titleColor,
                stroke: "#000000",
                strokeThickness: 8,
            })
            .setOrigin(0.5);

        this.add
            .text(512, 350, message, {
                fontFamily: "Arial",
                fontSize: "24px",
                color: "#FFFFFF",
            })
            .setOrigin(0.5);

        // Play Again button
        const playAgainBtn = this.add
            .text(512, 480, "PLAY AGAIN", {
                fontFamily: "Arial Black",
                fontSize: "32px",
                color: "#00FFFF",
                stroke: "#000000",
                strokeThickness: 6,
            })
            .setOrigin(0.5)
            .setInteractive();

        playAgainBtn.on("pointerover", () => playAgainBtn.setColor("#00FF00"));
        playAgainBtn.on("pointerout", () => playAgainBtn.setColor("#00FFFF"));
        playAgainBtn.on("pointerdown", () => this.scene.start("Game"));

        // Main Menu button
        const mainMenuBtn = this.add
            .text(512, 560, "MAIN MENU", {
                fontFamily: "Arial",
                fontSize: "24px",
                color: "#888888",
                stroke: "#000000",
                strokeThickness: 4,
            })
            .setOrigin(0.5)
            .setInteractive();

        mainMenuBtn.on("pointerover", () => mainMenuBtn.setColor("#FFFFFF"));
        mainMenuBtn.on("pointerout", () => mainMenuBtn.setColor("#888888"));
        mainMenuBtn.on("pointerdown", () => this.scene.start("MainMenu"));
    }
}

