import { addAudioToggle } from '../audioToggleUI.js';
import { multiplayer } from '../network/multiplayer.js';

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
        this.mobileControlsEnabled = false;
        this.mobileControlsInitialized = false;
        this.mobileInput = { left: false, right: false, jumpQueued: false };
        this.mobileMovementPointers = new Map();
        this.mobileJumpPointers = new Set();
        this.remoteLevelHandlers = [];
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
        const bodyHeight = this.player.height * 0.5;
        this.player.body.setSize(bodyWidth, bodyHeight);
        this.player.body.setOffset((this.player.width - bodyWidth) / 2, this.player.height * 0.5);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.setupMobileControls(width, height);

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
            if (multiplayer.isInRoom()) {
                this.setupRemoteLevelBridge();
                this.checkImmediateHostLevel();
            }
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
        const { left, right, jump } = this.getMovementInput();

        if (left && !right) {
            this.player.setVelocityX(-200);
            this.player.setFlipX(true);
        } else if (right && !left) {
            this.player.setVelocityX(200);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        if (jump && (grounded || touchingWall)) {
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

        const unlockedLevels = new Set(['alleyway', 'cave', 'river']);

        platformData.forEach((level) => {
            const x = level.xPercent * width;
            const y = baseY - (level.row || 0) * rowSpacing - (level.yOffset || 0);
            const locked = !unlockedLevels.has(level.key);
            const block = this.add.rectangle(x, y - 10, 140, 20, locked ? 0x555555 : 0x000000, locked ? 0.4 : 0.6).setOrigin(0.5);
            this.physics.add.existing(block, true);
            const entry = { ...level, locked };
            this.levelBlocks.push({ block, data: entry });

            if (locked) {
                const icon = this.add.image(x, y - 10, 'lock-overlay').setOrigin(0.5).setScale(0.5);
                icon.setDepth(5);
                block.lockIcon = icon;
            }

            this.physics.add.collider(this.player, block, () => {
                if (entry.locked) {
                    this.statusText.setText(`${entry.label} is coming soon.`);
                    return;
                }
                this.handleLevelLanding(entry, block);
            });
        });
    }

    handleLevelLanding(level, block) {
        if (!this.isHost || level.locked) {
            if (level.locked) {
                this.statusText.setText(`${level.label} is coming soon.`);
            }
            return;
        }

        const isSamePlatform = this.activePlatform?.block === block;

        if (!isSamePlatform) {
            this.levelBlocks.forEach(({ block: rect, data }) => rect.setFillStyle(data.locked ? 0x555555 : 0x000000, data.locked ? 0.4 : 0.6));
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
        this.levelBlocks.forEach(({ block, data }) => block.setFillStyle(data.locked ? 0x555555 : 0x000000, data.locked ? 0.4 : 0.6));
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

    isTouchDevice() {
        return !!this.sys?.game?.device?.input?.touch;
    }

    setupMobileControls(width, height) {
        if (!this.isTouchDevice()) {
            this.mobileControlsEnabled = false;
            return;
        }

        this.mobileControlsEnabled = true;
        this.mobileScreenWidth = width;
        this.mobileControlActivationY = height * 0.35;

        if (this.mobileControlsInitialized) {
            this.updateMobileJumpBounds();
            return;
        }

        this.mobileControlsInitialized = true;
        this.mobileInput = { left: false, right: false, jumpQueued: false };
        this.mobileMovementPointers = new Map();
        this.mobileJumpPointers = new Set();
        this.input.addPointer(2);

        this.createMobileJumpButton(width, height);

        this._mobilePointerDownHandler = (pointer) => this.handleMobilePointerDown(pointer);
        this._mobilePointerUpHandler = (pointer) => this.handleMobilePointerUp(pointer);
        this._mobilePointerUpOutsideHandler = (pointer) => this.handleMobilePointerUp(pointer);
        this._mobilePointerMoveHandler = (pointer) => this.handleMobilePointerMove(pointer);

        this.input.on('pointerdown', this._mobilePointerDownHandler, this);
        this.input.on('pointerup', this._mobilePointerUpHandler, this);
        this.input.on('pointerupoutside', this._mobilePointerUpOutsideHandler, this);
        this.input.on('pointermove', this._mobilePointerMoveHandler, this);

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.disposeMobileControls();
        });
    }

    createMobileJumpButton(width, height) {
        const radius = 60;
        const padding = 20;
        const x = padding + radius;
        const y = height - padding - radius;

        this.mobileJumpButton = this.add.circle(x, y, radius, 0x000000, 0.35)
            .setScrollFactor(0)
            .setDepth(1002);
        this.mobileJumpButton.setStrokeStyle(2, 0xffffff, 0.4);

        this.mobileJumpText = this.add.text(x, y, 'JUMP', {
            fontSize: '18px',
            fill: '#ffffff',
            fontStyle: 'bold'
        })
        .setOrigin(0.5)
        .setDepth(1003)
        .setScrollFactor(0);

        this.mobileJumpBounds = new Phaser.Geom.Rectangle(x - radius, y - radius, radius * 2, radius * 2);
    }

    updateMobileJumpBounds() {
        if (!this.mobileJumpButton) return;
        const radius = this.mobileJumpButton.radius;
        this.mobileJumpBounds = new Phaser.Geom.Rectangle(
            this.mobileJumpButton.x - radius,
            this.mobileJumpButton.y - radius,
            radius * 2,
            radius * 2
        );
    }

    handleMobilePointerDown(pointer) {
        if (!this.mobileControlsEnabled || pointer.pointerType === 'mouse') return;

        if (this.mobileJumpBounds && Phaser.Geom.Rectangle.Contains(this.mobileJumpBounds, pointer.x, pointer.y)) {
            this.mobileInput.jumpQueued = true;
            this.mobileJumpPointers.add(pointer.id);
            this.mobileJumpButton?.setAlpha(0.55);
            return;
        }

        if (pointer.y < this.mobileControlActivationY) return;

        const direction = pointer.x < this.mobileScreenWidth / 2 ? 'left' : 'right';
        this.mobileMovementPointers.set(pointer.id, direction);
        this.updateMobileMovementState();
    }

    handleMobilePointerUp(pointer) {
        if (!this.mobileControlsEnabled || pointer.pointerType === 'mouse') return;

        if (this.mobileJumpPointers.has(pointer.id)) {
            this.mobileJumpPointers.delete(pointer.id);
            if (this.mobileJumpPointers.size === 0) {
                this.mobileJumpButton?.setAlpha(0.35);
            }
            return;
        }

        if (this.mobileMovementPointers.has(pointer.id)) {
            this.mobileMovementPointers.delete(pointer.id);
            this.updateMobileMovementState();
        }
    }

    handleMobilePointerMove(pointer) {
        if (!this.mobileControlsEnabled || !pointer.isDown || pointer.pointerType === 'mouse') return;
        if (this.mobileJumpPointers.has(pointer.id)) return;
        if (!this.mobileMovementPointers.has(pointer.id)) return;

        if (pointer.y < this.mobileControlActivationY) {
            this.mobileMovementPointers.delete(pointer.id);
            this.updateMobileMovementState();
            return;
        }

        const direction = pointer.x < this.mobileScreenWidth / 2 ? 'left' : 'right';
        const prev = this.mobileMovementPointers.get(pointer.id);
        if (prev !== direction) {
            this.mobileMovementPointers.set(pointer.id, direction);
            this.updateMobileMovementState();
        }
    }

    updateMobileMovementState() {
        const directions = Array.from(this.mobileMovementPointers.values());
        this.mobileInput.left = directions.includes('left');
        this.mobileInput.right = directions.includes('right');
    }

    disposeMobileControls() {
        if (!this.mobileControlsInitialized) return;
        this.input.off('pointerdown', this._mobilePointerDownHandler, this);
        this.input.off('pointerup', this._mobilePointerUpHandler, this);
        this.input.off('pointerupoutside', this._mobilePointerUpOutsideHandler, this);
        this.input.off('pointermove', this._mobilePointerMoveHandler, this);
        this.mobileJumpButton?.destroy();
        this.mobileJumpText?.destroy();
        this.mobileJumpButton = null;
        this.mobileJumpText = null;
        this.mobileJumpBounds = null;
        this.mobileMovementPointers?.clear();
        this.mobileJumpPointers?.clear();
        this.mobileControlsInitialized = false;
    }

    consumeMobileJump() {
        if (!this.mobileInput.jumpQueued) return false;
        this.mobileInput.jumpQueued = false;
        return true;
    }

    getMovementInput() {
        const leftKey = this.cursors?.left?.isDown || false;
        const rightKey = this.cursors?.right?.isDown || false;
        const jumpKey = (this.cursors?.up?.isDown || false) || (this.cursors?.space?.isDown || false);

        return {
            left: leftKey || this.mobileInput.left,
            right: rightKey || this.mobileInput.right,
            jump: jumpKey || this.consumeMobileJump()
        };
    }

    setupRemoteLevelBridge() {
        this.teardownRemoteLevelBridge();
        const handleMetadata = ({ id }) => {
            const hostId = this.getHostPlayerId();
            if (!hostId || id !== hostId) return;
            const hostMeta = multiplayer.getPlayerMetadata(id);
            this.handleRemoteLevelKey(hostMeta?.currentLevel, 'metadata');
        };
        const handleEvent = (evt) => {
            if (evt?.type !== 'game:startLevel') return;
            this.handleRemoteLevelKey(evt?.payload?.level, 'room:event');
        };
        this.remoteLevelHandlers = [
            multiplayer.on('player:metadata', handleMetadata),
            multiplayer.on('room:event', handleEvent)
        ];
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardownRemoteLevelBridge());
    }

    teardownRemoteLevelBridge() {
        if (this.remoteLevelHandlers?.length) {
            this.remoteLevelHandlers.forEach((off) => off?.());
        }
        this.remoteLevelHandlers = [];
    }

    checkImmediateHostLevel() {
        const hostId = this.getHostPlayerId();
        if (!hostId) return;
        const hostMeta = multiplayer.getPlayerMetadata(hostId);
        if (hostMeta?.currentLevel) {
            this.handleRemoteLevelKey(hostMeta.currentLevel, 'initial');
        }
    }

    handleRemoteLevelKey(levelKey, source = 'unknown') {
        const sceneKey = this.resolveRemoteScene(levelKey);
        if (!sceneKey) return;
        console.info('[GameScene] remote level start via', source, 'level:', levelKey);
        this.teardownRemoteLevelBridge();
        this.saveMatchState({});
        this.scene.start(sceneKey, {
            joinCode: this.joinCode,
            connectionType: 'join',
            playerCount: this.playerCount,
            character: this.selectedCharacter,
            matchKey: this.matchKey,
            level: levelKey,
            round: 1,
            scores: { host: 0, opponent: 0 }
        });
    }

    resolveRemoteScene(levelKey) {
        if (typeof levelKey !== 'string' || !levelKey.endsWith('Level')) return null;
        if (!this.scene?.manager?.keys?.[levelKey]) return null;
        if (this.scene.key === levelKey) return null;
        return levelKey;
    }

    getHostPlayerId() {
        if (!multiplayer.isInRoom()) return null;
        const players = multiplayer.getPlayers() || [];
        const host = players.find((p) => p.isHost);
        return host?.id || null;
    }
}
