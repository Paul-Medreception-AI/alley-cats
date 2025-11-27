import { ensureBackgroundMusic } from '../audioManager.js';
import { addAudioToggle } from '../audioToggleUI.js';

const MATCH_KEY_PREFIX = 'alleycats:match:';

export default class GameScene extends Phaser.Scene {
    constructor() {
        super('Game');
        this.player = null;
        this.cursors = null;
        this.selectedCharacter = 'Joy';
        this.joinCode = '';
        this.selectedMode = 'local';
        this.playerCount = 1;
        this.requiredPlayers = 2;
        this.isHost = true;
        this.levelBlocks = [];
        this.levelCountdownTimer = null;
        this.activePlatform = null;
        this.selectedLevel = null;
        this.jumpTargetY = null;
        this.matchKey = null;
    }

    init(data) {
        this.selectedCharacter = data?.character || 'Joy';
        this.joinCode = data?.joinCode || '';
        this.selectedMode = data?.mode || 'local';
        this.playerCount = data?.playerCount ?? (data?.mode === 'local' ? 2 : 1);
        this.isHost = data?.connectionType !== 'join';
        this.jumpTargetY = null;
        this.matchKey = MATCH_KEY_PREFIX + (this.joinCode || 'local');
    }

    create() {
        ensureBackgroundMusic(this);
        const { width, height } = this.scale;
        addAudioToggle(this, { x: width - 120, y: 60 });
        const bg = this.add.image(width / 2, height / 2, 'levels-bg');
        const scaleX = width / bg.width;
        const scaleY = height / bg.height;
        const bgScale = Math.min(scaleX, scaleY);
        bg.setScale(bgScale).setScrollFactor(0);

        this.physics.world.setBounds(0, 0, width, height);
        const groundThickness = 8;
        const ground = this.add.rectangle(width / 2, height - groundThickness / 2, width, groundThickness, 0x1a1a2e);
        this.physics.add.existing(ground, true);

        const textureKey = this.getCharacterTexture(this.selectedCharacter);

        // Create player using selected character art
        this.player = this.physics.add.image(120, height - 200, textureKey);
        this.player.setScale(0.045);
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.1);

        // adjust body size for better collisions
        const bodyWidth = this.player.width * 0.4;
        const bodyHeight = this.player.height * 0.6;
        this.player.body.setSize(bodyWidth, bodyHeight);
        this.player.body.setOffset((this.player.width - bodyWidth) / 2, (this.player.height - bodyHeight) / 2);

        this.cursors = this.input.keyboard.createCursorKeys();

        this.physics.add.collider(this.player, ground);
        
        // Camera follows player
        this.cameras.main.setBounds(0, 0, width, height);
        this.cameras.main.startFollow(this.player, false, 0.05, 0.05);
        
        // HUD text
        this.instructionsText = this.add.text(16, 16, 'Use arrow keys to move, space to jump', { 
            fontSize: '18px', 
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 10, y: 5 }
        });

        if (this.joinCode) {
            this.add.text(this.cameras.main.width - 200, 16, `Code: ${this.joinCode}`, {
                fontSize: '18px',
                fill: '#fff',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: { x: 10, y: 5 }
            }).setScrollFactor(0).setOrigin(0, 0);
        }

        this.statusText = this.add.text(16, height - 60, 'Jump on a platform to pick a level.', {
            fontSize: '18px',
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 12, y: 6 }
        }).setScrollFactor(0);

        this.playerStatusText = this.add.text(width - 240, height - 60, '', {
            fontSize: '18px',
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 12, y: 6 }
        }).setScrollFactor(0).setOrigin(0, 0);
        this.updatePlayerStatus();

        if (this.isHost) {
            this.buildLevelPlatforms(width, height);
            this.statusText.setText('Hop onto a platform to select a level.');
        } else {
            this.player.setVisible(false);
            this.player.body.enable = false;
            this.instructionsText.setText('Waiting for host to select a level...');
            this.statusText.setText('Observers will auto-join once the host locks in a level.');
            this.time.addEvent({
                delay: 500,
                loop: true,
                callback: () => this.checkRemoteLaunch()
            });
        }

        this.createBackButton(width, height);
    }

    update() {
        if (!this.isHost) {
            return;
        }

        const grounded = this.player.body.touching.down || this.player.body.blocked.down;
        const touchingLeftWall = this.player.body.blocked.left;
        const touchingRightWall = this.player.body.blocked.right;
        const touchingWall = touchingLeftWall || touchingRightWall;
        // Player movement
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-200);
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(200);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        // Jumping
        if ((this.cursors.up.isDown || this.cursors.space.isDown) && (grounded || touchingWall)) {
            this.player.setVelocityY(-400);
            if (touchingWall) {
                const wallPush = touchingLeftWall ? 160 : -160;
                this.player.setVelocityX(wallPush);
            }
            this.jumpTargetY = this.player.y - 50;
        }

        if (this.jumpTargetY !== null) {
            if (grounded) {
                this.jumpTargetY = null;
            } else if (this.player.body.velocity.y < 0 && this.player.y <= this.jumpTargetY) {
                this.player.setVelocityY(0);
                this.jumpTargetY = null;
            }
        }

        this.monitorPlatformHold();
    }

    getCharacterTexture(character) {
        const key = character?.toLowerCase() || 'joy';
        switch (key) {
            case 'iz':
                return 'character-iz';
            case 'liz':
                return 'character-liz';
            case 'lulu':
                return 'character-lulu';
            case 'milo':
                return 'character-milo';
            case 'joy':
            default:
                return 'character-joy';
        }
    }

    buildLevelPlatforms(width, height) {
        const platformData = [
            { key: 'cliff', label: 'The Cliff', xPercent: 0.16 + (50 / width), row: 1, yOffset: -20 },
            { key: 'grass', label: 'Grass Lands', xPercent: 0.28 + (80 / width), row: 1, yOffset: 90 },
            { key: 'birds', label: 'Birds Nest', xPercent: 0.40 - (90 / width), row: 1, yOffset: 180 },
            { key: 'space', label: 'Space', xPercent: 0.52 - (20 / width), row: 1, yOffset: 270 },
            { key: 'blizzard', label: 'Blizzard', xPercent: 0.64, row: 1, yOffset: 280 },
            { key: 'jungle', label: 'The Jungle', xPercent: 0.78 - (70 / width), row: 1, yOffset: 170 },
            { key: 'scratching', label: 'Scratching Tree', xPercent: 0.9 - (335 / width), row: 1, yOffset: 90 },
            { key: 'obby', label: 'Obby', xPercent: 0.75 + (40 / width), row: 0, yOffset: 85 },
            { key: 'seasonal', label: 'Seasonal', xPercent: 0.6, row: 0, yOffset: 45 },
            { key: 'alleyway', label: 'Alley Way', xPercent: 0.45 + (10 / width), row: 0, yOffset: 45 },
            { key: 'random', label: 'Random?', xPercent: 0.3 + (395 / width), row: 0 },
            { key: 'kibble', label: 'Kibble Land', xPercent: 0.5 - (20 / width), row: 0, yOffset: 180 },
            { key: 'dogsbed', label: "Dog's Bed", xPercent: 0.12 + (180 / width), row: -1, yOffset: -30 },
            { key: 'dressing', label: 'Dressing Room', xPercent: 0.35 + (50 / width), row: -1, yOffset: 20 },
            { key: 'cave', label: 'The Cave', xPercent: 0.58 - (85 / width), row: -1, yOffset: -30 },
            { key: 'river', label: 'The River', xPercent: 0.82 - (190 / width), row: -1, yOffset: -30 }
        ];

        const baseY = height - 110;
        const rowSpacing = 60;

        platformData.forEach((level) => {
            const x = level.xPercent * width;
            const y = baseY - (level.row || 0) * rowSpacing - (level.yOffset || 0);
            const block = this.add.rectangle(x, y - 10, 140, 20, 0x000000, 0.5).setOrigin(0.5);
            this.physics.add.existing(block, true);
            this.levelBlocks.push({ block, data: level });

            this.physics.add.collider(this.player, block, () => {
                this.handleLevelLanding(level, block);
            });
        });
    }

    handleLevelLanding(level, block) {
        if (!this.isHost) return;

        const isSamePlatform = this.activePlatform?.block === block;

        if (!isSamePlatform) {
            this.levelBlocks.forEach(({ block: rect }) => rect.setFillStyle(0x000000, 0.5));
            block.setFillStyle(0x23c55e, 0.9);
            this.activePlatform = { level, block };
            this.selectedLevel = level;
            this.cancelTimers();
            if (level.key === 'dressing') {
                this.statusText.setText('Standing on Dressing Room... hold for 1 second.');
                this.startConfirmationTimer(level, block, true);
                return;
            }
            this.statusText.setText(`Standing on ${level.label}... hold for 1 second.`);
            this.startConfirmationTimer(level, block);
        }
    }

    launchLevel(level) {
        const sceneMap = {
            alleyway: 'AlleywayLevel',
            cave: 'CaveLevel',
            river: 'RiverLevel'
        };
        const targetScene = sceneMap[level.key] || 'AlleywayLevel';

        this.saveMatchState({
            level: level.key,
            timestamp: Date.now(),
            round: 1,
            scores: { host: 0, opponent: 0 }
        });

        this.scene.start(targetScene, {
            joinCode: this.joinCode,
            connectionType: this.isHost ? 'host' : 'join',
            playerCount: this.playerCount,
            character: this.selectedCharacter,
            level: level.key,
            matchKey: this.matchKey,
            round: 1,
            scores: { host: 0, opponent: 0 }
        });
    }

    updatePlayerStatus() {
        this.playerStatusText.setText(`Players: ${this.playerCount}/${this.requiredPlayers}`);
    }

    startConfirmationTimer(level, block, isDressing = false) {
        this.cancelCountdownTimer();
        this.levelCountdownTimer = this.time.delayedCall(1000, () => {
            this.levelCountdownTimer = null;
            if (!this.isPlayerOnPlatform(block) || this.activePlatform?.block !== block) {
                this.cancelTimers();
                this.resetPlatformSelection();
                return;
            }
            this.startLevelCountdown(level, block, isDressing);
        }, null, this);
    }

    startLevelCountdown(level, block, isDressing = false) {
        if (isDressing) {
            this.statusText.setText('Entering Dressing Room...');
            this.levelCountdownTimer = this.time.delayedCall(300, () => {
                this.levelCountdownTimer = null;
                this.enterDressingRoom();
            });
            return;
        }
        let remaining = 3;
        this.statusText.setText(`Starting ${level.label} in ${remaining}...`);
        this.levelCountdownTimer = this.time.addEvent({
            delay: 1000,
            repeat: 2,
            callback: () => {
                if (!this.isPlayerOnPlatform(block) || this.activePlatform?.block !== block) {
                    this.cancelTimers();
            this.statusText.setText('Hop onto a platform to select a level.');
            this.resetPlatformSelection();
            return;
        }
                remaining -= 1;
                if (remaining > 0) {
                    this.statusText.setText(`Starting ${level.label} in ${remaining}...`);
                } else {
                    this.statusText.setText(`Launching ${level.label}!`);
                    this.levelCountdownTimer = null;
                    this.launchLevel(level);
                }
            },
            callbackScope: this
        });
    }

    cancelTimers() {
        this.cancelCountdownTimer();
    }

    cancelCountdownTimer() {
        if (this.levelCountdownTimer) {
            this.levelCountdownTimer.remove(false);
            this.levelCountdownTimer = null;
        }
    }

    isPlayerOnPlatform(block) {
        if (!block || !this.player) return false;
        const bounds = block.getBounds();
        const bottomCenter = this.player.getBottomCenter();
        return Phaser.Geom.Rectangle.Contains(bounds, bottomCenter.x, bottomCenter.y + 2);
    }

    monitorPlatformHold() {
        if (!this.activePlatform) return;
        if (this.isPlayerOnPlatform(this.activePlatform.block)) return;
        this.cancelTimers();
        this.resetPlatformSelection();
    }

    resetPlatformSelection() {
        this.levelBlocks.forEach(({ block }) => block.setFillStyle(0xffffff, 0.25));
        this.activePlatform = null;
        this.selectedLevel = null;
        this.statusText.setText('Hop onto a platform to select a level.');
    }

    enterDressingRoom() {
        this.saveMatchState({});
        this.scene.start('CharacterSelect', {
            mode: this.selectedMode,
            joinCode: this.joinCode,
            connectionType: this.isHost ? 'host' : 'join',
            playerCount: this.playerCount
        });
    }

    saveMatchState(state) {
        if (!this.matchKey) return;
        window.localStorage.setItem(this.matchKey, JSON.stringify(state));
    }

    getMatchState() {
        if (!this.matchKey) return null;
        const raw = window.localStorage.getItem(this.matchKey);
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch (e) {
            return null;
        }
    }

    checkRemoteLaunch() {
        if (this.isHost) return;
        const state = this.getMatchState();
        if (!state?.level) return;
        const sceneMap = {
            alleyway: 'AlleywayLevel',
            cave: 'CaveLevel'
        };
        const targetScene = sceneMap[state.level] || 'AlleywayLevel';
        this.scene.start(targetScene, {
            joinCode: this.joinCode,
            connectionType: 'join',
            playerCount: this.playerCount,
            character: this.selectedCharacter,
            matchKey: this.matchKey,
            level: state.level,
            round: state.round || 1,
            scores: state.scores || { host: 0, opponent: 0 }
        });
    }

    createBackButton(width, height) {
        const backButton = this.add.text(width - 40, height - 20, 'BACK', {
            fontSize: '22px',
            fill: '#000',
            backgroundColor: '#fde047',
            padding: { x: 12, y: 6 },
            borderRadius: 6
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true }).setScrollFactor(0);

        backButton.on('pointerover', () => backButton.setStyle({
            fontSize: '22px',
            fill: '#000',
            backgroundColor: '#facc15',
            padding: { x: 12, y: 6 },
            borderRadius: 6
        }));

        backButton.on('pointerout', () => backButton.setStyle({
            fontSize: '22px',
            fill: '#000',
            backgroundColor: '#fde047',
            padding: { x: 12, y: 6 },
            borderRadius: 6
        }));

        backButton.on('pointerdown', () => {
            this.saveMatchState({});
            this.scene.start('LevelSelect', {
                mode: this.selectedMode,
                joinCode: this.joinCode,
                connectionType: this.isHost ? 'host' : 'join',
                playerCount: this.playerCount,
                character: this.selectedCharacter
            });
        });
    }
}
