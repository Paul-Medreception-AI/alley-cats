import BaseLevel from './BaseLevel';
import { addAudioToggle } from '../audioToggleUI.js';

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
        const startX = 150;
        const startY = height - 150;
        const platformDefs = [
            { x: startX, y: startY + 40, width: 120, height: 18 },
            { x: width * 0.35, y: height * 0.65, width: 140, height: 14 },
            { x: width * 0.5, y: height * 0.62, width: 100, height: 14 },
            { x: width * 0.65, y: height * 0.58, width: 160, height: 14 },
            { x: width * 0.45, y: height * 0.5, width: 90, height: 12 },
            { x: width * 0.62, y: height * 0.46, width: 120, height: 12 },
            { x: width * 0.78, y: height * 0.42, width: 110, height: 12 },
            { x: width * 0.55, y: height * 0.38, width: 80, height: 10 },
            { x: width * 0.7, y: height * 0.33, width: 90, height: 10 },
            { x: width * 0.85, y: height * 0.28, width: 120, height: 10 }
        ];

        platformDefs.forEach(def => {
            const platform = this.add.rectangle(def.x, def.y, def.width, def.height, 0xffffff, 0);
            this.physics.add.existing(platform, true);
            platform.body.checkCollision.down = false;
            platform.body.checkCollision.left = false;
            platform.body.checkCollision.right = false;
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
        const speed = 220;

        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-speed);
            this.player.setFlipX(true);
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(speed);
            this.player.setFlipX(false);
        } else {
            this.player.setVelocityX(0);
        }

        if ((this.cursors.up.isDown || this.cursors.space.isDown) && this.player.body.touching.down) {
            this.player.setVelocityY(-400);
        }
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
