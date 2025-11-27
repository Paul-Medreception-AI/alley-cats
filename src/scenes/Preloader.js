export default class Preloader extends Phaser.Scene {
    constructor() {
        super('Preloader');
    }

    preload() {
        // Loading bar
        const progress = this.add.graphics();
        this.load.on('progress', (value) => {
            progress.clear();
            progress.fillStyle(0x4cc9f0, 1);
            progress.fillRect(0, this.cameras.main.height / 2, 
                this.cameras.main.width * value, 30);
            
            // Add loading text
            const loadingText = this.add.text(
                this.cameras.main.width / 2, 
                this.cameras.main.height / 2 - 30, 
                'Loading...', 
                { fontSize: '24px', fill: '#ffffff' }
            ).setOrigin(0.5);
        });

        // Load assets
        this.load.image('tiles', 'assets/images/tiles.png');
        this.load.spritesheet('cat', 'assets/sprites/cat.png', {
            frameWidth: 32,
            frameHeight: 32
        });

        // Character portraits for controllable avatars
        this.load.image('character-joy', 'assets/images/Joy.png');
        this.load.image('character-iz', 'assets/images/IzAndLiz.png');
        this.load.image('character-liz', 'assets/images/IzAndLiz.png');
        this.load.image('character-lulu', 'assets/images/Lulu.png');
        this.load.image('character-milo', 'assets/images/Milo.png');

        // Audio
        this.load.audio('default-bgm', 'assets/sounds/cat-chattering-and-meowing.mp3');
        this.load.audio('alleycatBackgroundBeat', 'assets/sounds/alleycatBackgroundBeat.mp3');
        this.load.audio('cave-bgm', 'assets/sounds/caveSound.mp3');
        this.load.audio('river-bgm', 'assets/sounds/riverSound.mp3');

        // UI
        this.load.image('toggle-on', 'assets/images/ToggleOn.png');
        this.load.image('toggle-off', 'assets/images/toggleOff.png');
        this.load.image('lock-overlay', 'assets/images/lockNoBackground.png');

        this.load.on('complete', () => {
            progress.destroy();
            this.scene.start('Home');
        });
    }
}
