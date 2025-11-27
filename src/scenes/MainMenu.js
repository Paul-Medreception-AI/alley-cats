import { addAudioToggle } from '../audioToggleUI.js';

export default class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        const { width, height } = this.cameras.main;
        addAudioToggle(this);
        
        // Game Title
        this.add.text(width / 2, height / 2 - 100, 'ALLEY CATS', {
            fontSize: '64px',
            fill: '#4cc9f0',
            fontStyle: 'bold',
            stroke: '#fff',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Play Button
        const playButton = this.add.text(width / 2, height / 2 + 50, 'PLAY', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#4cc9f0',
            padding: { x: 20, y: 10 },
            borderRadius: 5
        }).setOrigin(0.5).setInteractive();

        // Button hover effects
        playButton.on('pointerover', () => {
            playButton.setStyle({ 
                fill: '#1a1a2e',
                backgroundColor: '#fff'
            });
            this.tweens.add({
                targets: playButton,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100,
                ease: 'Power2'
            });
        });

        playButton.on('pointerout', () => {
            playButton.setStyle({ 
                fill: '#fff',
                backgroundColor: '#4cc9f0'
            });
            this.tweens.add({
                targets: playButton,
                scaleX: 1,
                scaleY: 1,
                duration: 100,
                ease: 'Power2'
            });
        });

        // Add click handler for the play button
        playButton.on('pointerdown', () => {
            // Add a fade out effect
            this.cameras.main.fadeOut(300, 0, 0, 0);
            
            // Start the GameModeSelect scene after the fade out completes
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('GameModeSelect');
            });
        });
    }
}
