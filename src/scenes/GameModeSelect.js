import { addAudioToggle } from '../audioToggleUI.js';

export default class GameModeSelect extends Phaser.Scene {
    constructor() {
        super('GameModeSelect');
    }

    create() {
        const { width, height } = this.cameras.main;
        addAudioToggle(this, { x: width - 90, y: 50 });
        
        // Add title
        this.add.text(width / 2, height / 2 - 100, 'SELECT GAME MODE', {
            fontSize: '48px',
            fill: '#4cc9f0',
            fontStyle: 'bold',
            stroke: '#fff',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Create buttons container
        const buttonStyle = {
            fontSize: '24px',
            fill: '#fff',
            backgroundColor: '#4cc9f0',
            padding: { x: 30, y: 15 },
            borderRadius: 5
        };

        // Friends Button
        const friendsButton = this.add.text(width / 2, height / 2, 'PLAY WITH FRIENDS', buttonStyle)
            .setOrigin(0.5)
            .setInteractive();

        // Online Button
        const onlineButton = this.add.text(width / 2, height / 2 + 80, 'PLAY ONLINE', buttonStyle)
            .setOrigin(0.5)
            .setInteractive();

        // Add button hover effects
        const addButtonHover = (button) => {
            button.on('pointerover', () => {
                button.setStyle({ 
                    fill: '#1a1a2e',
                    backgroundColor: '#fff'
                });
                this.tweens.add({
                    targets: button,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 100,
                    ease: 'Power2'
                });
            });

            button.on('pointerout', () => {
                button.setStyle({ 
                    fill: '#fff',
                    backgroundColor: '#4cc9f0'
                });
                this.tweens.add({
                    targets: button,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100,
                    ease: 'Power2'
                });
            });
        };

        addButtonHover(friendsButton);
        addButtonHover(onlineButton);

        // Button click handlers
        friendsButton.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('HostOrJoin', { mode: 'local' });
            });
        });

        onlineButton.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('CharacterSelect', { mode: 'online' });
            });
        });

        // Fade in effect
        this.cameras.main.fadeIn(300, 0, 0, 0);
    }
}
