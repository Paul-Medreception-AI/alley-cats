import { addAudioToggle } from '../audioToggleUI.js';

export default class JoinGame extends Phaser.Scene {
    constructor() {
        super('JoinGame');
        this.mode = 'local';
    }

    init(data) {
        this.mode = data?.mode || 'local';
        this.connectionType = data?.connectionType || 'join';
        this.joinCode = data?.joinCode || '';
    }

    create() {
        const { width, height } = this.cameras.main;
        addAudioToggle(this, { x: width - 90, y: 60 });

        this.cameras.main.setBackgroundColor('#0f172a');

        this.add.text(width / 2, 80, 'ENTER GAME CODE', {
            fontSize: '52px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#4cc9f0',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.add.text(width / 2, 150, 'Ask the host for the 6-digit code and enter it below', {
            fontSize: '22px',
            fill: '#cbd5f5'
        }).setOrigin(0.5);

        const inputBackground = this.add.rectangle(width / 2, height / 2 - 30, 400, 80, 0xffffff, 0.15)
            .setStrokeStyle(3, 0x4cc9f0);

        this.codeText = this.add.text(width / 2, height / 2 - 30, '', {
            fontSize: '48px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        this.instructions = this.add.text(width / 2, height / 2 + 30, 'Tap numbers to enter code', {
            fontSize: '20px',
            fill: '#94a3b8'
        }).setOrigin(0.5);

        const keypadStartY = height / 2 + 160;
        this.createKeypad(width / 2, keypadStartY);

        const joinButton = this.add.text(width / 2, keypadStartY - 70, 'JOIN GAME', {
            fontSize: '28px',
            fill: '#0f172a',
            backgroundColor: '#67e8f9',
            padding: { x: 40, y: 20 },
            borderRadius: 8
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        joinButton.on('pointerover', () => joinButton.setStyle({
            fontSize: '28px',
            fill: '#ffffff',
            backgroundColor: '#0ea5e9',
            padding: { x: 40, y: 20 },
            borderRadius: 8
        }));
        joinButton.on('pointerout', () => joinButton.setStyle({
            fontSize: '28px',
            fill: '#0f172a',
            backgroundColor: '#67e8f9',
            padding: { x: 40, y: 20 },
            borderRadius: 8
        }));

        joinButton.on('pointerdown', () => {
            if (this.codeText.text.length === 6) {
                this.startCharacterSelect();
            } else {
                this.instructions.setText('Code must be 6 digits').setColor('#f87171');
            }
        });

        if (this.joinCode) {
            this.codeText.setText(this.joinCode);
            if (this.joinCode.length === 6) {
                this.instructions.setText('Ready to join!').setColor('#22c55e');
            }
        }

        const backButton = this.add.text(40, height - 60, 'BACK', {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: 'rgba(255,255,255,0.1)',
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
            backgroundColor: 'rgba(255,255,255,0.1)',
            padding: { x: 20, y: 10 },
            borderRadius: 6
        }));

        backButton.on('pointerdown', () => {
            this.scene.start('HostOrJoin', { mode: this.mode, connectionType: 'join', joinCode: this.joinCode });
        });
    }

    createKeypad(centerX, startY) {
        const digits = [
            ['1', '2', '3'],
            ['4', '5', '6'],
            ['7', '8', '9'],
            ['DEL', '0', 'CLR']
        ];

        const buttonStyle = {
            fontSize: '26px',
            fill: '#0f172a',
            backgroundColor: '#e2e8f0',
            padding: { x: 28, y: 16 },
            borderRadius: 6
        };

        digits.forEach((row, rowIndex) => {
            row.forEach((value, colIndex) => {
                const btn = this.add.text(
                    centerX + (colIndex - 1) * 150,
                    startY + rowIndex * 80,
                    value,
                    buttonStyle
                ).setOrigin(0.5).setInteractive({ useHandCursor: true });

                btn.on('pointerover', () => btn.setStyle({
                    ...buttonStyle,
                    backgroundColor: '#67e8f9'
                }));
                btn.on('pointerout', () => btn.setStyle(buttonStyle));
                btn.on('pointerdown', () => this.onKeypadPress(value));
            });
        });
    }

    onKeypadPress(value) {
        if (value === 'DEL') {
            this.codeText.setText(this.codeText.text.slice(0, -1));
            this.instructions.setText('Tap numbers to enter code').setColor('#94a3b8');
        } else if (value === 'CLR') {
            this.codeText.setText('');
            this.instructions.setText('Tap numbers to enter code').setColor('#94a3b8');
        } else if (this.codeText.text.length < 6) {
            this.codeText.setText(this.codeText.text + value);
            if (this.codeText.text.length === 6) {
                this.instructions.setText('Ready to join!').setColor('#22c55e');
            }
        }
    }

    startCharacterSelect() {
        this.cameras.main.fadeOut(250, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('CharacterSelect', { 
                mode: this.mode,
                connectionType: this.connectionType,
                joinCode: this.codeText.text
            });
        });
    }
}
