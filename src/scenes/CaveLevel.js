import BaseLevel from './BaseLevel';
import { addAudioToggle } from '../audioToggleUI.js';

const CAVE_DEFAULT_LAYOUT = [
    { x: 0.09416666666666666, y: 0.35285714285714287, width: 271.97239329789784, height: 14, visible: false },
    { x: 0.3175, y: 0.18, width: 83.95629728535363, height: 23.823848583300652, visible: true },
    { x: 0.565, y: 0.6571428571428571, width: 123.25474539548725, height: 31.55310462003132, visible: true },
    { x: 0.2325, y: 0.45714285714285713, width: 64.64059893491373, height: 58.46410046478866, visible: false },
    { x: 0.3441666666666667, y: 0.44571428571428573, width: 126.72991504147097, height: 12, visible: true },
    { x: 0.6433333333333333, y: 0.477049898383188, width: 86.71075412390041, height: 24.130142263536754, visible: true },
    { x: 0.41333333333333333, y: 0.3157142857142857, width: 110.53478903755286, height: 20, visible: true },
    { x: 0.5058333333333334, y: 0.7985714285714286, width: 103.9735475256598, height: 20, visible: true },
    { x: 0.7583333333333333, y: 0.32571428571428573, width: 113.79399196786642, height: 23.097606697652566, visible: true },
    { x: 0.6375, y: 0.32142857142857145, width: 49.92190594407321, height: 31.357891224726103, visible: true },
    { x: 0.4225, y: 0.6157142857142858, width: 82.01554173268342, height: 20.516267782942123, visible: true },
    { x: 0.525, y: 0.5114285714285715, width: 65.43991271586896, height: 26.2050023949057, visible: true },
    { x: 0.8925, y: 0.9085714285714286, width: 304.542837043825, height: 20, visible: true }
];

const CAVE_DEFAULT_SPAWNS = [
    { x: 0.07097948997705548, y: 0.12259055592443543 },
    { x: 0.05397738442217908, y: 0.12111550511602945 },
    { x: 0.09519839355755172, y: 0.1307033353706684 },
    { x: 0.03808703121605931, y: 0.1292282845622624 },
    { x: 0.11467319149662022, y: 0.13439096239168336 }
];

export default class CaveLevel extends BaseLevel {
    constructor() {
        super('CaveLevel');
        this.backgrounds = [];
        this.currentBackgroundIndex = 0;
        this.totalRounds = 5;
    }

    init(data) {
        this.joinCode = data?.joinCode || '';
        this.connectionType = data?.connectionType || 'host';
        this.character = data?.character || 'Joy';
        this.playerCount = data?.playerCount || 1;
        this.round = data?.round || 1;
        this.scores = data?.scores || { host: 0, opponent: 0 };
        this.level = data?.level || 'cave';
        this.matchKey = data?.matchKey || null;
        this.falls = 0;
        this.roundEnded = false;
        this.inHoney = false;
    }

    preload() {
        super.preloadCommon();
        this.load.image('cave-bg', 'assets/images/thecave.jpg');
    }

    create() {
        const { width, height } = this.scale;
        this.initializeSpawnPoints(width, height);
        this.startPosition = this.getSpawnPoint(0);

        this.createBackgrounds(width, height);
        this.showBackgroundForRound();

        this.physics.world.setBounds(0, 0, width, height);

        this.platforms = this.physics.add.staticGroup();
        this.createPlatforms(width, height);

        this.createPlayer(width, height);
        this.createHUD(width, height);
        this.createHoneyZone(width, height);
        this.createEndZone(width, height);
        this.createBackButton(width, height);
        addAudioToggle(this, { x: width - 90, y: 110 });
        this.saveMatchState();

        this.cameras.main.setBounds(0, 0, width, height);

        this.initEditor(width, height);
        this.setupMultiplayerSupport();
        this.setupMobileControls(width, height);
    }

    createBackgrounds(width, height) {
        const tints = [0xffffff, 0xfff0e0, 0xe0f7ff, 0xf0e0ff, 0xe8ffe0];
        this.backgrounds = tints.map((tint, index) => {
            const bg = this.add.image(width / 2, height / 2, 'cave-bg')
                .setTint(tint)
                .setVisible(index === 0)
                .setScrollFactor(0);

            const scaleX = width / bg.width;
            const scaleY = height / bg.height;
            const scale = Math.max(scaleX, scaleY);
            bg.setScale(scale);

            return bg;
        });
    }

    showBackgroundForRound() {
        const index = (this.round - 1) % this.backgrounds.length;
        this.currentBackgroundIndex = index;
        this.backgrounds.forEach((bg, idx) => bg.setVisible(idx === index));
    }

    createPlatforms(width, height) {
        const startX = width * 0.08;
        const startY = height * 0.2;
        const start = this.add.rectangle(startX, startY, 220, 30, 0x000000, 0);
        this.physics.add.existing(start, true);
        this.platforms.add(start);
        this.startPlatform = start;
        this.disableStartPlatformCollision(this.startPlatform);

        CAVE_DEFAULT_LAYOUT.forEach(def => {
            const platWidth = def.width ?? 120;
            const platHeight = def.height ?? 20;
            const platX = def.x <= 1 ? def.x * width : def.x;
            const platY = def.y <= 1 ? def.y * height : def.y;
            const isVisible = def.visible !== false;
            const platform = this.add.rectangle(platX, platY, platWidth, platHeight, 0x000000, isVisible ? 1 : 0);
            this.physics.add.existing(platform, true);
            platform._isVisible = isVisible;
            platform.setVisible(isVisible);
            this.platforms.add(platform);
        });
    }

    createPlayer(width, height) {
        const textureKey = this.getCharacterTexture(this.character);
        this.player = this.physics.add.image(this.startPosition.x, this.startPosition.y, textureKey);
        this.player.setScale(0.045);
        this.player.setCollideWorldBounds(true);
        this.player.setBounce(0.05);
        const bodyWidth = this.player.width * 0.4;
        const bodyHeight = this.player.height * 0.5;
        this.player.body.setSize(bodyWidth, bodyHeight);
        this.player.body.setOffset((this.player.width - bodyWidth) / 2, this.player.height * 0.5);

        this.physics.add.collider(this.player, this.platforms);

        this.cursors = this.input.keyboard.createCursorKeys();
        this.attachLocalPlayerLabel();
    }

    createHUD(width, height) {
        this.roundText = this.add.text(16, 16, `Round ${this.round}/${this.totalRounds}`, {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 10, y: 6 }
        }).setScrollFactor(0);

        this.scoreText = this.add.text(16, 48, `Host ${this.scores.host} - Opponent ${this.scores.opponent}`, {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 10, y: 6 }
        }).setScrollFactor(0);

        this.statusText = this.add.text(width / 2, height - 40, 'Reach END before falling in honey!', {
            fontSize: '22px',
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0);
    }

    createHoneyZone(width, height) {
        this.honeyZone = this.add.rectangle(width / 2, height - 15, width, 30, 0xf5c542, 0.4);
        this.physics.add.existing(this.honeyZone, true);
        this.physics.add.overlap(this.player, this.honeyZone, () => this.handleHoneyFall());
    }

    createEndZone(width, height) {
        this.endZone = this.add.zone(width - 80, height - 140, 120, 140);
        this.physics.world.enable(this.endZone);
        this.endZone.body.setAllowGravity(false);
        this.endZone.body.moves = false;
        this.physics.add.overlap(this.player, this.endZone, () => this.handleGoal());
    }

    update() {
        if (this.roundEnded) return;
        const { left, right, jump } = this.getMovementInput();
        const speed = 220;

        if (left && !right) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (right && !left) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        if (jump && this.player.body.touching.down) {
            this.player.setVelocityY(-400);
        }

        this.updateLocalNameLabel();
        this.broadcastPlayerState();
    }

    handleHoneyFall() {
        if (this.roundEnded || this.inHoney) return;
        this.inHoney = true;
        this.falls += 1;
        if (this.falls === 1) {
            this.statusText.setText('Sticky honey! Respawning...');
            this.respawnPlayer();
            this.time.delayedCall(700, () => { this.inHoney = false; });
        } else {
            this.statusText.setText('Stuck in honey! Opponent scores.');
            this.finishRound(false);
        }
    }

    respawnPlayer() {
        this.player.setVelocity(0, 0);
        this.player.setPosition(this.startPosition.x, this.startPosition.y);
        this.player.body.setAllowGravity(true);
    }

    handleGoal() {
        if (this.roundEnded) return;
        this.statusText.setText('You reached the end!');
        this.finishRound(true);
    }

    finishRound(didWin) {
        if (this.roundEnded) return;
        this.roundEnded = true;
        this.player.setVelocity(0, 0);
        this.player.body.enable = false;
        if (didWin) {
            this.scores.host += 1;
        } else {
            this.scores.opponent += 1;
        }
        this.updateScoreboard();
        this.saveMatchState();

        this.time.delayedCall(1500, () => {
            const nextRound = this.round + 1;
            if (nextRound > this.totalRounds) {
                this.showFinalScore();
            } else {
                this.scene.restart({
                    joinCode: this.joinCode,
                    connectionType: this.connectionType,
                    character: this.character,
                    playerCount: this.playerCount,
                    round: nextRound,
                    scores: this.scores,
                    level: this.level,
                    matchKey: this.matchKey
                });
            }
        });
    }

    updateScoreboard() {
        this.roundText.setText(`Round ${this.round}/${this.totalRounds}`);
        this.scoreText.setText(`Host ${this.scores.host} - Opponent ${this.scores.opponent}`);
    }

    showFinalScore() {
        this.add.rectangle(this.scale.width / 2, this.scale.height / 2, this.scale.width, this.scale.height, 0x000000, 0.7);
        this.add.text(this.scale.width / 2, this.scale.height / 2 - 40, 'Cave Challenge Complete!', {
            fontSize: '36px',
            fill: '#fde047'
        }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 20,
            `Host ${this.scores.host} - Opponent ${this.scores.opponent}`,
            { fontSize: '28px', fill: '#fff' }).setOrigin(0.5);

        this.add.text(this.scale.width / 2, this.scale.height / 2 + 70, 'Press BACK to exit', {
            fontSize: '20px',
            fill: '#fff'
        }).setOrigin(0.5);

        this.time.delayedCall(2000, () => {
            this.scene.start('GameScene', {
                joinCode: this.joinCode,
                connectionType: this.connectionType,
                playerCount: this.playerCount,
                character: this.character,
                round: 1,
                scores: { host: 0, opponent: 0 }
            });
        });
        this.clearMatchState();
    }

    createDefaultSpawnPoints() {
        return CAVE_DEFAULT_SPAWNS.map(sp => ({ ...sp }));
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

    saveMatchState() {
        if (!this.matchKey) return;
        window.localStorage.setItem(this.matchKey, JSON.stringify({
            level: this.level,
            round: this.round,
            scores: this.scores
        }));
    }

    clearMatchState() {
        if (!this.matchKey) return;
        window.localStorage.removeItem(this.matchKey);
    }

    createBackButton(width, height) {
        const btn = this.add.text(width - 40, height - 20, 'BACK', {
            fontSize: '20px',
            fill: '#000',
            backgroundColor: '#fde047',
            padding: { x: 12, y: 6 },
            borderRadius: 6
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true }).setScrollFactor(0);

        btn.on('pointerover', () => btn.setStyle({
            fontSize: '20px',
            fill: '#000',
            backgroundColor: '#facc15',
            padding: { x: 12, y: 6 },
            borderRadius: 6
        }));

        btn.on('pointerout', () => btn.setStyle({
            fontSize: '20px',
            fill: '#000',
            backgroundColor: '#fde047',
            padding: { x: 12, y: 6 },
            borderRadius: 6
        }));

        btn.on('pointerdown', () => {
            this.clearMatchState();
            this.scene.start('GameScene', {
                joinCode: this.joinCode,
                connectionType: this.connectionType,
                playerCount: this.playerCount,
                character: this.character
            });
        });
    }
}
