import { addAudioToggle } from '../audioToggleUI.js';
import { multiplayer } from '../network/multiplayer.js';
import { getStoredPlayerName, promptForPlayerName } from '../utils/playerName.js';

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
        this.ensurePlayerName(true);

        this.cameras.main.setBackgroundColor('#0f172a');

        this.add.text(width / 2, 80, 'ENTER GAME CODE', {
            fontSize: '52px',
            fill: '#ffffff',
            fontStyle: 'bold',
            stroke: '#4cc9f0',
            strokeThickness: 6
        }).setOrigin(0.5);

        this.codeLength = this.joinCode?.length || 4;
        this.add.text(width / 2, 150, `Ask the host for the ${this.codeLength}-character code and enter it below`, {
            fontSize: '22px',
            fill: '#cbd5f5'
        }).setOrigin(0.5);

        const inputBackground = this.add.rectangle(width / 2, height / 2 - 30, 400, 80, 0xffffff, 0.15)
            .setStrokeStyle(3, 0x4cc9f0);

        this.codeText = this.add.text(width / 2, height / 2 - 30, '', {
            fontSize: '48px',
            fill: '#ffffff'
        }).setOrigin(0.5);

        this.codeInputBackground = inputBackground;

        this.defaultInstructionMessage = 'Type the host code using your keyboard';
        this.instructions = this.add.text(width / 2, height / 2 + 30, this.defaultInstructionMessage, {
            fontSize: '20px',
            fill: '#94a3b8'
        }).setOrigin(0.5);

        this.enableKeyboardEntry();
        this.setupMobileCodeInput();

        const joinButton = this.add.text(width / 2, height / 2 + 110, 'JOIN GAME', {
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

        joinButton.on('pointerdown', () => this.tryJoin());

        if (this.joinCode) {
            const normalized = this.joinCode.toUpperCase();
            this.codeText.setText(normalized);
            if (normalized.length === this.codeLength) {
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

    setupMobileCodeInput() {
        const isTouch = this.sys.game.device.input.touch;
        if (!isTouch) {
            return;
        }

        if (!this.domCodeInput) {
            this.createDomCodeInput();
        }

        const focusInput = () => {
            if (!this.domCodeInput) return;
            // Ensure value reflects current text before editing
            this.domCodeInput.value = this.codeText.text || '';
            this.domCodeInput.focus({ preventScroll: true });
            // iOS sometimes needs a second tick to focus
            setTimeout(() => {
                this.domCodeInput && this.domCodeInput.focus({ preventScroll: true });
            }, 0);
        };

        this.codeInputBackground?.setInteractive({ useHandCursor: true }).on('pointerdown', focusInput);
        this.codeText?.setInteractive({ useHandCursor: true }).on('pointerdown', focusInput);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.cleanupDomCodeInput();
        });
    }

    createDomCodeInput() {
        if (typeof document === 'undefined') return;
        const input = document.createElement('input');
        input.type = 'text';
        input.autocomplete = 'one-time-code';
        input.inputMode = 'text';
        input.maxLength = this.codeLength;
        input.style.position = 'fixed';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        input.style.left = '50%';
        input.style.top = '50%';
        input.style.transform = 'translate(-50%, -50%)';
        input.style.zIndex = '9999';

        const handleInput = () => {
            const raw = (input.value || '').toUpperCase();
            const filtered = raw.replace(/[^0-9A-Z]/g, '').slice(0, this.codeLength);
            if (filtered !== input.value) {
                input.value = filtered;
            }
            this.codeText.setText(filtered);
            if (filtered.length === this.codeLength) {
                this.instructions.setText('Ready to join!').setColor('#22c55e');
            } else {
                this.instructions.setText(this.defaultInstructionMessage).setColor('#94a3b8');
            }
        };

        input.addEventListener('input', handleInput);

        document.body.appendChild(input);
        this.domCodeInput = input;
        this._domCodeInputHandler = handleInput;
    }

    cleanupDomCodeInput() {
        if (!this.domCodeInput) return;
        if (this._domCodeInputHandler) {
            this.domCodeInput.removeEventListener('input', this._domCodeInputHandler);
        }
        if (this.domCodeInput.parentNode) {
            this.domCodeInput.parentNode.removeChild(this.domCodeInput);
        }
        this.domCodeInput = null;
        this._domCodeInputHandler = null;
    }

    enableKeyboardEntry() {
        this.input.keyboard.on('keydown', this.handleKeyboardInput, this);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.input.keyboard.off('keydown', this.handleKeyboardInput, this);
        });
    }

    onKeypadPress(value) {
        if (value === 'DEL') {
            this.codeText.setText(this.codeText.text.slice(0, -1));
            this.instructions.setText(this.defaultInstructionMessage).setColor('#94a3b8');
        } else if (value === 'CLR') {
            this.codeText.setText('');
            this.instructions.setText(this.defaultInstructionMessage).setColor('#94a3b8');
        } else if (this.codeText.text.length < this.codeLength) {
            this.codeText.setText((this.codeText.text + value.toUpperCase()));
            if (this.codeText.text.length === this.codeLength) {
                this.instructions.setText('Ready to join!').setColor('#22c55e');
            }
        }
    }

    handleKeyboardInput(event) {
        if (event.key === 'Backspace') {
            this.onKeypadPress('DEL');
            event.preventDefault();
            return;
        }

        if (event.key === 'Delete') {
            this.onKeypadPress('CLR');
            event.preventDefault();
            return;
        }

        if (event.key === 'Enter') {
            this.tryJoin();
            event.preventDefault();
            return;
        }

        if (/^[0-9a-zA-Z]$/.test(event.key)) {
            this.onKeypadPress(event.key.toUpperCase());
            event.preventDefault();
        }
    }

    async tryJoin() {
        const code = this.codeText.text.toUpperCase();
        if (code.length !== this.codeLength) {
            this.instructions.setText(`Code must be ${this.codeLength} characters`).setColor('#f87171');
            return;
        }

        this.instructions.setText('Connecting...').setColor('#93c5fd');
        try {
            const stored = getStoredPlayerName();
            const finalName = stored || promptForPlayerName(multiplayer.localName);
            if (finalName) {
                multiplayer.setDisplayName(finalName);
                multiplayer.setLocalMetadata({ name: finalName });
            }
            await multiplayer.ensureConnection();
            await multiplayer.joinRoom(code);
            this.instructions.setText('Connected!').setColor('#22c55e');
            this.startCharacterSelect();
        } catch (error) {
            console.error('[JoinGame] join failed', error);
            this.instructions.setText(`Unable to join (${error.message})`).setColor('#f87171');
        }
    }

        ensurePlayerName() {
        const chosen = promptForPlayerName(multiplayer.localName);
        multiplayer.setDisplayName(chosen);
        multiplayer.setLocalMetadata({ name: chosen });
        return chosen;
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
