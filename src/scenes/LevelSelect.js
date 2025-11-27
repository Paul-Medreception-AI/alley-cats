import { addAudioToggle } from '../audioToggleUI.js';

export default class LevelSelect extends Phaser.Scene {
    constructor() {
        super('LevelSelect');
        this.connectionInfo = {};
    }

    init(data) {
        this.connectionInfo = data || {};
    }

    preload() {
        this.load.image('levels-bg', 'assets/images/levelsBackground.jpg');
    }

    create() {
        const { width, height } = this.cameras.main;
        addAudioToggle(this, { x: width - 90, y: 50 });
        const background = this.add.image(width / 2, height / 2, 'levels-bg');
        const scaleX = width / background.width;
        const scaleY = height / background.height;
        const scale = Math.min(scaleX, scaleY);
        background.setScale(scale).setScrollFactor(0);

        this.add.rectangle(width / 2, 80, 500, 100, 0x000000, 0.4)
            .setStrokeStyle(4, 0xffffff);
        this.add.text(width / 2, 80, 'SELECT A LEVEL', {
            fontSize: '48px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const code = this.connectionInfo.joinCode || '------';
        this.add.rectangle(width - 160, height - 80, 280, 100, 0x000000, 0.7)
            .setOrigin(0.5);
        this.add.text(width - 160, height - 120, 'GAME CODE', {
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.add.text(width - 160, height - 70, code, {
            fontSize: '36px',
            fill: '#fde047',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const backButton = this.add.text(40, height - 60, 'BACK', {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 20, y: 10 },
            borderRadius: 6
        }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

        backButton.on('pointerover', () => backButton.setStyle({
            fontSize: '24px',
            fill: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 20, y: 10 },
            borderRadius: 6
        }));
        backButton.on('pointerout', () => backButton.setStyle({
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 20, y: 10 },
            borderRadius: 6
        }));
        backButton.on('pointerdown', () => {
            this.scene.start('CharacterSelect', this.connectionInfo);
        });

        this.add.text(width / 2, height - 80, 'Use arrows to walk, space to jump', {
            fontSize: '26px',
            fill: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        this.time.delayedCall(300, () => this.startLevel('alley'));
    }

    startLevel(levelKey) {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('Game', {
                ...this.connectionInfo,
                level: levelKey
            });
        });
    }
}
