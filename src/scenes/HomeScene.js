import { ensureBackgroundMusic } from '../audioManager.js';
import { addAudioToggle } from '../audioToggleUI.js';

export default class HomeScene extends Phaser.Scene {
    constructor() {
        super('Home');
    }

    preload() {
        // Load assets for the home scene
        this.load.image('yarn', 'assets/images/yarnball.png');
        this.load.image('catmouth', 'assets/images/catmouth.png');
    }

    create() {
        const musicOpts = { key: 'alleycatBackgroundBeat', volume: 0.4 };
        ensureBackgroundMusic(this, musicOpts);
        const { width, height } = this.cameras.main;
        addAudioToggle(this, { musicOptions: musicOpts });
        
        // Set background color
        this.cameras.main.setBackgroundColor('#f0f8ff');
        
        // Add title with cat ears
        const title = this.add.text(width / 2, height / 3, 'ALLEY CATS', {
            fontSize: '64px',
            fill: '#4cc9f0',
            fontStyle: 'bold',
            stroke: '#fff',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Add larger cat ears to the title
        this.add.triangle(
            width / 2 - 120,  // x position (farther left)
            height / 3 - 40,   // y position (slightly above title)
            0, 40, 30, -20, 60, 40,  // points for the triangle
            0x4cc9f0           // color
        ).setStrokeStyle(2, 0xffffff);
        
        this.add.triangle(
            width / 2 + 120,  // x position (farther right)
            height / 3 - 40,   // y position (slightly above title)
            0, 40, 30, -20, 60, 40,  // points for the triangle
            0x4cc9f0           // color
        ).setStrokeStyle(2, 0xffffff);

        // Add cat mouth image below the title
        const mouth = this.add.image(width / 2, height / 3 + 30, 'catmouth')
            .setOrigin(0.5, 0);
        const mouthScale = title.width / mouth.width;  // Keep width aligned with the title
        mouth.setScale(mouthScale);

        // Scatter yarn balls around the screen for a playful feel
        const yarnPositions = [
            { x: width * 0.2, y: height * 0.55, scale: 0.32 },
            { x: width / 2, y: height - 160, scale: 0.38 },  // Center yarn above PLAY
            { x: width * 0.75, y: height * 0.65, scale: 0.3 }
        ];

        yarnPositions.forEach(({ x, y, scale }) => {
            this.add.image(x, y, 'yarn')
                .setScale(scale)
                .setAngle(Phaser.Math.Between(-45, 45));
        });

        // Add play button
        const playButton = this.add.text(width / 2, height - 150, 'PLAY', {
            fontSize: '32px',
            fill: '#fff',
            backgroundColor: '#4cc9f0',
            padding: { x: 30, y: 15 },
            borderRadius: 5
        }).setOrigin(0.5).setInteractive();

        // Add controls information near bottom of screen
        this.add.text(width / 2, height - 60, 'CONTROLS', {
            fontSize: '20px',
            fill: '#4cc9f0',
            fontStyle: 'bold',
            stroke: '#fff',
            strokeThickness: 1
        }).setOrigin(0.5);

        this.add.text(width / 2, height - 30, '← → : Move   ↑ or SPACE : Jump', {
            fontSize: '18px',
            fill: '#fff',
            fontStyle: 'bold',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 15, y: 6 },
            borderRadius: 5
        }).setOrigin(0.5);

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

        playButton.on('pointerdown', () => {
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                this.scene.start('GameModeSelect');
            });
        });

        // Add version number
        this.add.text(width - 20, height - 20, 'Version: Beta', {
            fontSize: '14px',
            fill: '#4cc9f0',
            fontStyle: 'italic'
        }).setOrigin(1, 1);

        // Fade in effect
        this.cameras.main.fadeIn(500, 0, 0, 0);
    }
}
