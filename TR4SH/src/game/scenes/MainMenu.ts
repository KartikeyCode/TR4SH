import { Scene } from "phaser";

export class MainMenu extends Scene {
    constructor() {
        super("MainMenu");
    }

    create() {
        this.cameras.main.setBackgroundColor(0x000000);

        // Title
        this.add
            .text(512, 250, "TR4SH", {
                fontFamily: "Arial Black",
                fontSize: "80px",
                color: "#00FFFF",
                stroke: "#000000",
                strokeThickness: 8,
            })
            .setOrigin(0.5);

        // Subtitle
        this.add
            .text(512, 350, "1v1 plebs, Win GOR", {
                fontFamily: "Arial",
                fontSize: "24px",
                color: "#FFFFFF",
            })
            .setOrigin(0.5);

        // Start button
        const startButton = this.add
            .text(512, 500, "START GAME", {
                fontFamily: "Arial Black",
                fontSize: "32px",
                color: "#00FF00",
                stroke: "#000000",
                strokeThickness: 6,
            })
            .setOrigin(0.5)
            .setInteractive();

        // Hover effect
        startButton.on("pointerover", () => {
            startButton.setColor("#00FFFF");
        });

        startButton.on("pointerout", () => {
            startButton.setColor("#00FF00");
        });

        // Start game on click
        startButton.on("pointerdown", () => {
            this.scene.start("Game");
        });

        // Instructions
        this.add
            .text(512, 650, "Use Arrow Keys to move", {
                fontFamily: "Arial",
                fontSize: "18px",
                color: "#888888",
                align: "center",
            })
            .setOrigin(0.5);
    }
}

