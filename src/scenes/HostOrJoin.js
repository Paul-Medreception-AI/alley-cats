import { ensureBackgroundMusic } from '../audioManager.js';
import { addAudioToggle } from '../audioToggleUI.js';

export default class HostOrJoin extends Phaser.Scene {
    constructor() {
        super('HostOrJoin');
    }

    init(data) {
        this.mode = data?.mode || 'local';
        this.connectionType = data?.connectionType || 'host';
        this.joinCode = data?.joinCode || null;
    }

    create() {
        ensureBackgroundMusic(this);
        const { width, height } = this.cameras.main;
        addAudioToggle(this, { x: width - 90, y: 70 });

        this.cameras.main.setBackgroundColor('#1a1a2e');

        this.add.text(width / 2, 120, 'HOST OR JOIN A GAME', {
            fontSize: '56px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#4cc9f0',
            strokeThickness: 6
        }).setOrigin(0.5);

        const description = this.add.text(width / 2, 200, 'Choose how you want to connect with your friends', {
            fontSize: '22px',
            fill: '#d0d0d0'
        }).setOrigin(0.5);

        const buttonStyle = {
            fontSize: '28px',
            fill: '#1a1a2e',
            backgroundColor: '#4cc9f0',
            padding: { x: 40, y: 20 },
            borderRadius: 8
        };

        const hoverStyle = {
            fill: '#ffffff',
            backgroundColor: '#5eead4'
        };

        const createButton = (label, x, y, onClick) => {
            const btn = this.add.text(x, y, label, buttonStyle)
                .setOrigin(0.5)
                .setInteractive({ useHandCursor: true });

            btn.on('pointerover', () => btn.setStyle({ ...buttonStyle, ...hoverStyle }));
            btn.on('pointerout', () => btn.setStyle(buttonStyle));
            btn.on('pointerdown', () => onClick());

            return btn;
        };

        createButton('HOST', width / 2, height / 2 - 20, () => {
            const code = this.joinCode || this.generateHostCode();
            this.joinCode = code;
            this.startCharacterSelect('host', code);
        });

        createButton('JOIN A GAME BY ENTERING GAME CODE', width / 2, height / 2 + 100, () => {
            this.startJoinFlow();
        });

        // back to mode select if needed
        const backButton = this.add.text(40, height - 60, 'BACK', {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.15)',
            padding: { x: 20, y: 10 },
            borderRadius: 6
        }).setOrigin(0, 0).setInteractive({ useHandCursor: true });

        backButton.on('pointerover', () => backButton.setStyle({
            fontSize: '24px',
            fill: '#000000',
            backgroundColor: '#ffffff'
        }));
        backButton.on('pointerout', () => backButton.setStyle({
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.15)',
            padding: { x: 20, y: 10 },
            borderRadius: 6
        }));
        backButton.on('pointerdown', () => {
            this.scene.start('GameModeSelect');
        });
    }

    startCharacterSelect(connectionType, code = null) {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('CharacterSelect', { 
                mode: this.mode, 
                connectionType,
                joinCode: code
            });
        });
    }

    startJoinFlow() {
        this.cameras.main.fadeOut(200, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('JoinGame', { mode: this.mode, connectionType: 'join', joinCode: this.joinCode });
        });
    }

    generateHostCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }
}
