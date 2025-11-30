import { addAudioToggle } from '../audioToggleUI.js';
import { multiplayer } from '../network/multiplayer.js';

export default class LevelSelect extends Phaser.Scene {
    constructor() {
        super('LevelSelect');
        this.connectionInfo = {};
    }

    init(data) {
        this.connectionInfo = data || {};
    }

    preload() {
        this.load.image('levels-bg', 'assets/images/levelsBackground.jpg');
    }

    create() {
        const { width, height } = this.cameras.main;
        addAudioToggle(this, { x: width - 90, y: 50 });
        const background = this.add.image(width / 2, height / 2, 'levels-bg');
        const scaleX = width / background.width;
        const scaleY = height / background.height;
        const scale = Math.min(scaleX, scaleY);
        background.setScale(scale).setScrollFactor(0);

        this.add.rectangle(width / 2, 80, 500, 100, 0x000000, 0.4)
            .setStrokeStyle(4, 0xffffff);
        this.add.text(width / 2, 80, 'SELECT A LEVEL', {
            fontSize: '48px',
            fill: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const code = this.connectionInfo.joinCode || '------';
        this.add.rectangle(width - 160, height - 80, 280, 100, 0x000000, 0.7)
            .setOrigin(0.5);
        this.add.text(width - 160, height - 120, 'GAME CODE', {
            fontSize: '20px',
            fill: '#ffffff'
        }).setOrigin(0.5);
        this.add.text(width - 160, height - 70, code, {
            fontSize: '36px',
            fill: '#fde047',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const backButton = this.add.text(40, height - 60, 'BACK', {
            fontSize: '24px',
            fill: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.6)',
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
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 20, y: 10 },
            borderRadius: 6
        }));
        backButton.on('pointerdown', () => {
            this.scene.start('CharacterSelect', this.connectionInfo);
        });

        this.add.text(width / 2, height - 80, 'Use arrows to walk, space to jump', {
            fontSize: '26px',
            fill: '#ffffff',
            backgroundColor: 'rgba(0,0,0,0.5)',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5);

        if (this.connectionInfo.connectionType === 'join' && multiplayer.isInRoom()) {
            this.waitText = this.add.text(width / 2, height / 2 + 180, 'Waiting for host to start...', {
                fontSize: '24px',
                fill: '#fef3c7',
                backgroundColor: 'rgba(0,0,0,0.5)',
                padding: { x: 16, y: 8 }
            }).setOrigin(0.5);

            const maybeStartFromMetadata = () => {
                const host = this.getHostPlayer();
                if (!host) return false;
                const hostMeta = multiplayer.getPlayerMetadata(host.id);
                if (hostMeta?.currentLevel) {
                    console.info('[LevelSelect] host metadata currentLevel', hostMeta.currentLevel);
                    this.waitText?.destroy();
                    this.cleanupWaitHandlers();
                    this.startSceneForLevel(hostMeta.currentLevel);
                    return true;
                }
                return false;
            };

            if (!maybeStartFromMetadata()) {
                this.waitingHandler = multiplayer.on('room:event', (evt) => {
                    if (evt?.type === 'game:startLevel') {
                        console.debug('[LevelSelect] room:event', evt);
                        this.waitText?.destroy();
                        this.cleanupWaitHandlers();
                        this.startSceneForLevel(evt?.payload?.level || 'alley');
                    }
                });
                this.metadataHandler = multiplayer.on('player:metadata', ({ id }) => {
                    const host = this.getHostPlayer();
                    if (host && id === host.id) {
                        if (maybeStartFromMetadata()) {
                            this.cleanupWaitHandlers();
                        }
                    }
                });
                this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
                    this.cleanupWaitHandlers();
                });
            }
        } else {
            this.time.delayedCall(300, () => this.startLevel('alley'));
        }
    }

    startLevel(levelKey) {
        if (this.connectionInfo.connectionType === 'host' && multiplayer.isInRoom()) {
            multiplayer.setLocalMetadata({ currentLevel: levelKey });
            multiplayer.broadcast('game:startLevel', { level: levelKey });
        }
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start('Game', {
                ...this.connectionInfo,
                level: levelKey
            });
        });
    }

    getHostPlayer() {
        if (!multiplayer.isInRoom()) return null;
        const players = multiplayer.getPlayers() || [];
        return players.find((p) => p.isHost) || null;
    }

    cleanupWaitHandlers() {
        if (this.waitingHandler) {
            this.waitingHandler();
            this.waitingHandler = null;
        }
        if (this.metadataHandler) {
            this.metadataHandler();
            this.metadataHandler = null;
        }
    }

    startSceneForLevel(levelKey = 'alley') {
        const targetScene = this.resolveSceneKey(levelKey);
        const payload = { ...this.connectionInfo, level: levelKey };
        console.info('[LevelSelect] starting scene', targetScene, 'for level', levelKey);
        this.scene.start(targetScene, payload);
    }

    resolveSceneKey(levelKey) {
        const candidate = typeof levelKey === 'string' ? levelKey : '';
        const sceneExists = candidate && this.scene?.manager?.keys && this.scene.manager.keys[candidate];
        const looksLikeLevel = candidate.endsWith('Level');
        if (sceneExists && looksLikeLevel) {
            return candidate;
        }
        return 'Game';
    }
}
