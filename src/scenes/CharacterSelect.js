import { ensureBackgroundMusic } from '../audioManager.js';
import { addAudioToggle } from '../audioToggleUI.js';

export default class CharacterSelect extends Phaser.Scene {
    constructor() {
        super('CharacterSelect');
        this.selectedMode = 'local';
    }

    init(data) {
        this.selectedMode = data?.mode || 'local';
        this.connectionType = data?.connectionType || 'host';
        this.joinCode = data?.joinCode || null;
        this.playerCount = data?.playerCount || (this.connectionType === 'host' ? 1 : 2);
    }

    preload() {
        this.load.image('characters-bg', 'assets/images/characters.jpg');
    }

    create() {
        ensureBackgroundMusic(this);
        const { width, height } = this.cameras.main;
        addAudioToggle(this, { x: width - 90, y: 50 });

        // Background that covers entire scene
        const background = this.add.image(width / 2, height / 2 + 120, 'characters-bg');
        const scaleX = width / background.width;
        const scaleY = height / background.height;
        const scale = Math.max(scaleX, scaleY);
        background.setScale(scale).setScrollFactor(0);

        this.add.text(width / 2, 60, 'SELECT YOUR CHARACTER', {
            fontSize: '48px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#1a1a2e',
            strokeThickness: 6
        }).setOrigin(0.5);

        const modeLabel = this.selectedMode === 'online'
            ? 'Playing Online'
            : this.connectionType === 'host'
                ? 'Play With Friends - Host'
                : 'Play With Friends - Join';

        this.add.text(width - 10, 30, modeLabel, {
            fontSize: '24px',
            fill: '#fff',
            backgroundColor: 'rgba(26,26,46,0.7)',
            padding: { x: 16, y: 8 },
            borderRadius: 8
        }).setOrigin(1, 0);

        // Back button to return to mode selection
        const backButton = this.add.text(width - 40, 120, 'BACK', {
            fontSize: '28px',
            fill: '#000000',
            backgroundColor: '#4169e1',
            padding: { x: 20, y: 10 },
            borderRadius: 8
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

        const backHover = { fill: '#ffffff', backgroundColor: '#1f3bb3' };
        const backDefault = { fill: '#000000', backgroundColor: '#4169e1' };

        backButton.on('pointerover', () => backButton.setStyle(backHover));
        backButton.on('pointerout', () => backButton.setStyle(backDefault));
        backButton.on('pointerdown', () => {
            this.cameras.main.fadeOut(200, 0, 0, 0);
            this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
                if (this.selectedMode === 'online') {
                    this.scene.start('GameModeSelect');
                } else if (this.connectionType === 'host') {
                    this.scene.start('HostOrJoin', { mode: this.selectedMode, connectionType: 'host', joinCode: this.joinCode });
                } else if (this.connectionType === 'join') {
                    this.scene.start('JoinGame', { mode: this.selectedMode, connectionType: 'join', joinCode: this.joinCode });
                } else {
                    this.scene.start('GameModeSelect');
                }
            });
        });

        const buttonStyle = {
            fontSize: '18px',
            fill: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 16, y: 6 },
            borderRadius: 6
        };

        const selectButtons = [
            { name: 'Milo', x: width * 0.28 + 35, y: height * 0.42 + 95 },
            { name: 'Lulu', x: width * 0.28 + 50, y: height * 0.74 + 125 },
            { name: 'Liz', x: width * 0.58 + 5, y: height * 0.42 + 85 },
            { name: 'Iz', x: width * 0.72 - 40, y: height * 0.42 + 85 },
            { name: 'Joy', x: width * 0.62 + 60, y: height * 0.74 + 135 }
        ];

        selectButtons.forEach(({ name, x, y }) => {
            const btn = this.add.text(x, y, 'SELECT', buttonStyle)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            const hoverStyle = { fill: '#ffffff', backgroundColor: '#4cc9f0' };
            const defaultStyle = { fill: '#000000', backgroundColor: '#ffffff' };

            btn.on('pointerover', () => btn.setStyle(hoverStyle));
            btn.on('pointerout', () => btn.setStyle(defaultStyle));
            btn.on('pointerdown', () => this.handleCharacterSelect(name));
        });

        this.cameras.main.fadeIn(300, 0, 0, 0);
    }

    handleCharacterSelect(character) {
        const code = this.getConnectionCode();
        const levelPayload = {
            mode: this.selectedMode,
            character,
            connectionType: this.connectionType,
            joinCode: code,
            playerCount: this.playerCount
        };

        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('LevelSelect', levelPayload);
        });
    }

    getConnectionCode() {
        if (this.selectedMode === 'online') {
            return null;
        }

        if (this.connectionType === 'host') {
            if (!this.joinCode) {
                this.joinCode = Math.floor(100000 + Math.random() * 900000).toString();
            }
            return this.joinCode;
        }

        return this.joinCode;
    }
}
