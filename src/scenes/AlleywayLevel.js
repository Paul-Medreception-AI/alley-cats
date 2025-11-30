import BaseLevel from './BaseLevel';
import { addAudioToggle } from '../audioToggleUI.js';

const ALLEYWAY_DEFAULT_LAYOUT = [
    { x: 0.4083333333333333, y: 0.06428571428571428, width: 128.09756516221552, height: 22, visible: true },
    { x: 0.36, y: 0.3314285714285714, width: 74.09915313426681, height: 30.348977457954813, visible: true },
    { x: 0.2658333333333333, y: 0.26857142857142857, width: 92.03836670192709, height: 22, visible: true },
    { x: 0.41833333333333333, y: 0.15428571428571428, width: 94.12995754126372, height: 22, visible: true },
    { x: 0.44916666666666666, y: 0.40714285714285714, width: 109.78378535027058, height: 20, visible: true },
    { x: 0.8158333333333333, y: 0.4157142857142857, width: 249.4075783983721, height: 22, visible: false },
    { x: 0.7091666666666666, y: 0.37285714285714283, width: 110, height: 22, visible: true },
    { x: 0.46416666666666667, y: 0.10285714285714286, width: 68.94767216520052, height: 22, visible: true },
    { x: 0.6117251293241556, y: 0.38142857142857145, width: 76.17925755041342, height: 22, visible: true },
    { x: 0.3416666666666667, y: 0.19142857142857142, width: 62.57044374592704, height: 22, visible: true },
    { x: 0.5191666666666667, y: 0.33, width: 65.14088749185419, height: 42.134443534741735, visible: true },
    { x: 0.5466666666666666, y: 0.22714285714285715, width: 65.64337990447176, height: 33.42296235649451, visible: true },
    { x: 0.4741666666666667, y: 0.7842857142857143, width: 190.3680261852394, height: 22, visible: true },
    { x: 0.24333333333333335, y: 0.44285714285714284, width: 35.38457997613929, height: 43.74831801533645, visible: true },
    { x: 0.07583333333333334, y: 0.3557142857142857, width: 270.96216612667007, height: 20, visible: false },
    { x: 0.9375, y: 0.6857142857142857, width: 169.46521096244714, height: 20, visible: true }
];

const ALLEYWAY_DEFAULT_SPAWNS = [
    { x: 0.15206056821236524, y: 0.13439096239168333 },
    { x: 0.10745639347100043, y: 0.13586601320008937 },
    { x: 0.08959172325404624, y: 0.13660353860429233 },
    { x: 0.12865632073422448, y: 0.13586601320008934 },
    { x: 0.07154495839273206, y: 0.13144086077487135 }
];

export default class AlleywayLevel extends BaseLevel {
    constructor() {
        super('AlleywayLevel');
        this.lightsOn = true;
        this.maxRounds = 5;
        this.roundEnded = false;
        this.maxFalls = 2;
        this.falls = 0;
        this.totalRounds = this.maxRounds;
    }

    init(data) {
        this.joinCode = data?.joinCode || '';
        this.isHost = data?.connectionType !== 'join';
        this.character = data?.character || 'Joy';
        this.playerCount = data?.playerCount || 1;
        this.round = data?.round || 1;
        this.scores = data?.scores || { host: 0, opponent: 0 };
        this.matchKey = data?.matchKey || null;
        this.falls = 0;
        this.roundEnded = false;
    }

    preload() {
        super.preloadCommon();
        this.load.image('alleyway-on', 'assets/images/AlleywayLightOn.jpg');
        this.load.image('alleyway-off', 'assets/images/AlleywayLightOff.jpg');
        this.load.spritesheet('arrow', 'assets/images/arrow.png', { frameWidth: 16, frameHeight: 16 });
    }

    create() {
        const { width, height } = this.scale;
        this.initializeSpawnPoints(width, height);
        this.startPosition = this.getSpawnPoint(0);

        const { bgOn, bgOff } = this.createAlignedBackgrounds(width, height);
        this.bgOn = bgOn;
        this.bgOff = bgOff;
        this.backgrounds = [this.bgOn, this.bgOff];
        this.time.addEvent({
            delay: 2000,
            loop: true,
            callback: () => {
                this.lightsOn = !this.lightsOn;
                this.bgOn.setVisible(this.lightsOn);
                this.bgOff.setVisible(!this.lightsOn);
            }
        });

        this.add.text(width - 120, height - 40, 'Alley Way', {
            fontSize: '24px',
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 4
        }).setOrigin(1, 1);

        if (this.joinCode) {
            this.add.text(width - 220, 20, `Code: ${this.joinCode}`, {
                fontSize: '20px',
                fill: '#fff',
                backgroundColor: 'rgba(0,0,0,0.7)',
                padding: { x: 12, y: 6 }
            }).setScrollFactor(0);
        }

        this.createHUD(width, height);
        this.createBackButton(width, height);
        this.setupWorld(width, height);
        addAudioToggle(this, { x: width - 90, y: 110 });
        this.initEditor(width, height);
        this.setupMobileControls(width, height);
    }

    createAlignedBackgrounds(width, height) {
        const texOn = this.textures.get('alleyway-on').getSourceImage();
        const texOff = this.textures.get('alleyway-off').getSourceImage();
        const sizeOn = { width: texOn.width, height: texOn.height };
        const sizeOff = { width: texOff.width, height: texOff.height };

        const scaleOn = Math.max(width / sizeOn.width, height / sizeOn.height);
        const scaleOff = Math.max(width / sizeOff.width, height / sizeOff.height);

        const scaledOnW = sizeOn.width * scaleOn;
        const scaledOnH = sizeOn.height * scaleOn;
        const scaledOffW = sizeOff.width * scaleOff;
        const scaledOffH = sizeOff.height * scaleOff;

        const offsetOnX = (scaledOnW - width) / 2;
        const offsetOnY = (scaledOnH - height) / 2;
        const offsetOffX = (scaledOffW - width) / 2;
        const offsetOffY = (scaledOffH - height) / 2;

        const bgOn = this.add.image(-offsetOnX, -offsetOnY, 'alleyway-on')
            .setOrigin(0, 0)
            .setDisplaySize(scaledOnW, scaledOnH)
            .setVisible(true);

        const bgOff = this.add.image(-offsetOffX, -offsetOffY, 'alleyway-off')
            .setOrigin(0, 0)
            .setDisplaySize(scaledOffW, scaledOffH)
            .setVisible(false);

        return { bgOn, bgOff };
    }

    createBackButton(width, height) {
        const btn = this.add.text(width - 40, height - 20, 'BACK', {
            fontSize: '20px',
            fill: '#000',
            backgroundColor: '#fde047',
            padding: { x: 12, y: 6 },
            borderRadius: 6
        }).setOrigin(1, 1).setInteractive({ useHandCursor: true });

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
            this.scene.start('GameScene', {
                joinCode: this.joinCode,
                connectionType: this.isHost ? 'host' : 'join',
                playerCount: this.playerCount,
                character: this.character
            });
        });
    }

    createHUD(width, height) {
        this.roundText = this.add.text(16, 16, `Round ${this.round}/${this.totalRounds}`, {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 10, y: 6 }
        }).setScrollFactor(0);

        this.scoreText = this.add.text(16, 48, '', {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 10, y: 6 }
        }).setScrollFactor(0);
        this.updateScoreDisplay();

        this.statusText = this.add.text(width / 2, height - 40, 'Reach the end platform!', {
            fontSize: '22px',
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0);
    }

    setupWorld(width, height) {
        this.physics.world.setBounds(0, 0, width, height);
        this.platforms = this.physics.add.staticGroup();
        this.createPlatforms(width, height);
        this.createPlayer();
        this.createFailureZone(width, height);
        this.createGoalZone(width, height);
        this.setupMultiplayerSupport();
    }

    createPlatforms(width, height) {
        this.startPlatform = this.add.rectangle(width * 0.07, height * 0.22, 220, 30, 0x000000, 0);
        this.physics.add.existing(this.startPlatform, true);
        this.platforms.add(this.startPlatform);
        this.disableStartPlatformCollision(this.startPlatform);

        ALLEYWAY_DEFAULT_LAYOUT.forEach(item => {
            const platWidth = item.width ?? 120;
            const platHeight = item.height ?? 22;
            const platX = item.x <= 1 ? item.x * width : item.x;
            const platY = item.y <= 1 ? item.y * height : item.y;
            const isVisible = item.visible !== false;
            const plat = this.add.rectangle(
                platX,
                platY,
                platWidth,
                platHeight,
                0x000000,
                isVisible ? 1 : 0
            );
            this.physics.add.existing(plat, true);
            plat._isVisible = isVisible;
            plat.setVisible(isVisible);
            this.platforms.add(plat);
        });
    }

    createPlayer() {
        const key = this.getCharacterTexture(this.character);
        const textureExists = this.textures.exists(key);
        const resolvedKey = textureExists ? key : 'character-joy';
        if (!textureExists) {
            console.warn(`[AlleywayLevel] Texture "${key}" missing, falling back to Joy.`);
        }

        this.player = this.physics.add.sprite(this.startPosition.x, this.startPosition.y - 20, resolvedKey);
        this.player.setScale(0.05);
        const bodyWidth = this.player.width * 0.4;
        const bodyHeight = this.player.height * 0.5;
        this.player.body.setSize(bodyWidth, bodyHeight);
        this.player.body.setOffset((this.player.width - bodyWidth) / 2, this.player.height * 0.5);
        this.player.setBounce(0.1);
        this.player.setDragX(600);
        this.player.setCollideWorldBounds(true);
        this.physics.add.collider(this.player, this.platforms, () => {
            if (this.player.body.touching.down) this.player.body.velocity.y = 0;
        });
        this.cursors = this.input.keyboard.createCursorKeys();
        this.player.setDepth(5);
        this.attachLocalPlayerLabel();
    }

    createFailureZone(width, height) {
        this.failureZone = this.add.rectangle(width / 2, height - 20, width, 40, 0x000000, 0);
        this.physics.add.existing(this.failureZone, true);
        this.physics.add.overlap(this.player, this.failureZone, () => this.handleFailure());
    }

    createGoalZone(width, height) {
        const goalWidth = 150;
        const goalHeight = 160;
        const goalX = width * 0.93;
        const goalY = height * 0.75;
        this.goalZone = this.add.rectangle(goalX, goalY, goalWidth, goalHeight, 0x00ff00, 0);
        this.physics.add.existing(this.goalZone, true);
        this.physics.add.overlap(this.player, this.goalZone, () => this.handleVictory());

        const goalLabelBg = this.add.rectangle(goalX, goalY - goalHeight / 2 - 30, 100, 36, 0x000000, 0.6);
        this.add.text(goalLabelBg.x, goalLabelBg.y, 'GOAL', {
            fontSize: '20px',
            fill: '#fff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
    }

    update() {
        if (this.roundEnded) return;
        
        // Only process input for the local player
        if (this.player && this.player.body) {
            const { left, right, jump } = this.getMovementInput();
            const speed = 240;
            
            // Apply horizontal movement
            if (left && !right) {
                this.player.setVelocityX(-speed);
                this.player.setFlipX(true);
            } else if (right && !left) {
                this.player.setVelocityX(speed);
                this.player.setFlipX(false);
            } else {
                this.player.setVelocityX(0);
            }

            // Handle jumping
            if (jump && this.player.body.touching.down) {
                this.player.setVelocityY(-420);
            }

            // Update the local player's name label position
            this.updateLocalNameLabel();
            
            // Broadcast the player's state to other players
            this.broadcastPlayerState();
        }
    }

    handleFailure() {
        if (this.roundEnded) return;
        this.falls += 1;
        if (this.falls >= this.maxFalls) {
            this.roundEnded = true;
            this.statusText.setText(`${this.character} lost to the rats!`);
            this.player.setTint(0x444444);
            this.player.setVelocity(0, 0);
            this.time.delayedCall(3000, () => this.restartRound(false));
        } else {
            this.statusText.setText('Caught by rats! Respawning...');
            this.respawnPlayer();
        }
    }

    respawnPlayer() {
        this.player.setVelocity(0, 0);
        this.player.setPosition(this.startPosition.x, this.startPosition.y);
    }

    handleVictory() {
        if (this.roundEnded) return;
        this.roundEnded = true;
        this.statusText.setText(`${this.character} reached the end!`);
        this.showWinner(`${this.character} wins!`);
        this.time.delayedCall(3000, () => this.restartRound(true));
    }

    showWinner(message) {
        const { width, height } = this.scale;
        const overlay = this.add.rectangle(width / 2, height / 2, width, 180, 0x000000, 0.7);
        const text = this.add.text(width / 2, height / 2, message, {
            fontSize: '32px',
            fill: '#fde047',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.time.delayedCall(2800, () => {
            overlay.destroy();
            text.destroy();
        });
    }

    restartRound(didWin) {
        if (didWin) {
            this.scores.host = (this.scores.host || 0) + 1;
            this.updateScoreDisplay();
        } else {
            this.showWinner('No winner this round');
        }
        const nextRound = this.round + 1;
        if (nextRound > this.totalRounds) {
            this.statusText.setText('Alley Way challenge finished! Returning...');
            this.time.delayedCall(2000, () => {
                this.scene.start('GameScene', {
                    joinCode: this.joinCode,
                    connectionType: this.isHost ? 'host' : 'join',
                    playerCount: this.playerCount,
                    character: this.character,
                    round: 1,
                    scores: { host: 0, opponent: 0 }
                });
            });
        } else {
            this.scene.restart({
                joinCode: this.joinCode,
                connectionType: this.isHost ? 'host' : 'join',
                playerCount: this.playerCount,
                character: this.character,
                round: nextRound,
                scores: this.scores
            });
        }
    }

    updateScoreDisplay() {
        if (!this.scoreText) return;
        const hostScore = this.scores?.host ?? 0;
        const opponentScore = this.scores?.opponent ?? 0;
        const label = this.isHost ? 'You' : 'Host';
        const rivalLabel = this.isHost ? 'Opponent' : 'Host';
        this.scoreText.setText(`${label}: ${hostScore} | ${rivalLabel}: ${opponentScore}`);
    }

    createDefaultSpawnPoints() {
        return ALLEYWAY_DEFAULT_SPAWNS.map(sp => ({ ...sp }));
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

    createResizeHandles(dragRect, platform) {
        if (!dragRect.resizeHandles) {
            dragRect.resizeHandles = [];
        }

        const handleSize = 16;
        const handleOffset = 10;
        const platformWidth = platform.displayWidth;
        const platformHeight = platform.displayHeight;

        // Define handle positions relative to platform
        const handlePositions = [
            { x: -platformWidth/2, y: -platformHeight/2, angle: -45, type: 'nw' },  // Top-left
            { x: 0, y: -platformHeight/2, angle: 0, type: 'n' },                   // Top
            { x: platformWidth/2, y: -platformHeight/2, angle: 45, type: 'ne' },    // Top-right
            { x: platformWidth/2, y: 0, angle: 90, type: 'e' },                     // Right
            { x: platformWidth/2, y: platformHeight/2, angle: 135, type: 'se' },    // Bottom-right
            { x: 0, y: platformHeight/2, angle: 180, type: 's' },                  // Bottom
            { x: -platformWidth/2, y: platformHeight/2, angle: 225, type: 'sw' },   // Bottom-left
            { x: -platformWidth/2, y: 0, angle: 270, type: 'w' }                   // Left
        ];

        // Create handles if they don't exist
        if (dragRect.resizeHandles.length === 0) {
            handlePositions.forEach(pos => {
                const handle = this.add.sprite(0, 0, 'arrow')
                    .setScale(0.8)
                    .setVisible(false)
                    .setInteractive({ useHandCursor: true })
                    .setAngle(pos.angle)
                    .setDepth(1000);

                handle.type = pos.type;
                handle.platform = platform;
                handle.dragRect = dragRect;
                
                // Store original positions for reference
                handle.originalX = pos.x;
                handle.originalY = pos.y;
                handle.originalWidth = platformWidth;
                handle.originalHeight = platformHeight;

                // Set up drag events
                this.input.setDraggable(handle);
                
                // Store initial positions on drag start
                handle.on('dragstart', () => {
                    handle.startX = platform.x;
                    handle.startY = platform.y;
                    handle.startWidth = platform.displayWidth;
                    handle.startHeight = platform.displayHeight;
                    handle.startPointerX = this.input.activePointer.worldX;
                    handle.startPointerY = this.input.activePointer.worldY;
                    
                    // Make this handle appear on top while dragging
                    handle.setDepth(1001);
                    handle.setScale(1.0);
                });

                // Handle resizing during drag
                handle.on('drag', (pointer) => {
                    const MIN_SIZE = 20;
                    const MAX_SIZE = 2400;
                    
                    const deltaX = pointer.worldX - handle.startPointerX;
                    const deltaY = pointer.worldY - handle.startPointerY;
                    
                    let newX = handle.startX;
                    let newY = handle.startY;
                    let newWidth = handle.startWidth;
                    let newHeight = handle.startHeight;

                    // Adjust position and size based on handle type
                    switch (handle.type) {
                        case 'nw':
                            newWidth = Phaser.Math.Clamp(handle.startWidth - deltaX, MIN_SIZE, MAX_SIZE);
                            newHeight = Phaser.Math.Clamp(handle.startHeight - deltaY, MIN_SIZE, MAX_SIZE);
                            newX = handle.startX + (handle.startWidth - newWidth) / 2;
                            newY = handle.startY + (handle.startHeight - newHeight) / 2;
                            break;
                        case 'n':
                            newHeight = Phaser.Math.Clamp(handle.startHeight - deltaY, MIN_SIZE, MAX_SIZE);
                            newY = handle.startY + (handle.startHeight - newHeight) / 2;
                            break;
                        case 'ne':
                            newWidth = Phaser.Math.Clamp(handle.startWidth + deltaX, MIN_SIZE, MAX_SIZE);
                            newHeight = Phaser.Math.Clamp(handle.startHeight - deltaY, MIN_SIZE, MAX_SIZE);
                            newX = handle.startX - (newWidth - handle.startWidth) / 2;
                            newY = handle.startY + (handle.startHeight - newHeight) / 2;
                            break;
                        case 'e':
                            newWidth = Phaser.Math.Clamp(handle.startWidth + deltaX, MIN_SIZE, MAX_SIZE);
                            newX = handle.startX - (newWidth - handle.startWidth) / 2;
                            break;
                        case 'se':
                            newWidth = Phaser.Math.Clamp(handle.startWidth + deltaX, MIN_SIZE, MAX_SIZE);
                            newHeight = Phaser.Math.Clamp(handle.startHeight + deltaY, MIN_SIZE, MAX_SIZE);
                            newX = handle.startX - (newWidth - handle.startWidth) / 2;
                            newY = handle.startY - (newHeight - handle.startHeight) / 2;
                            break;
                        case 's':
                            newHeight = Phaser.Math.Clamp(handle.startHeight + deltaY, MIN_SIZE, MAX_SIZE);
                            newY = handle.startY - (newHeight - handle.startHeight) / 2;
                            break;
                        case 'sw':
                            newWidth = Phaser.Math.Clamp(handle.startWidth - deltaX, MIN_SIZE, MAX_SIZE);
                            newHeight = Phaser.Math.Clamp(handle.startHeight + deltaY, MIN_SIZE, MAX_SIZE);
                            newX = handle.startX + (handle.startWidth - newWidth) / 2;
                            newY = handle.startY - (newHeight - handle.startHeight) / 2;
                            break;
                        case 'w':
                            newWidth = Phaser.Math.Clamp(handle.startWidth - deltaX, MIN_SIZE, MAX_SIZE);
                            newX = handle.startX + (handle.startWidth - newWidth) / 2;
                            break;
                    }

                    // Update platform
                    platform.x = newX;
                    platform.y = newY;
                    platform.displayWidth = newWidth;
                    platform.width = newWidth;
                    platform.displayHeight = newHeight;
                    platform.height = newHeight;
                    platform.body.setSize(newWidth, newHeight);
                    platform.body.updateFromGameObject();

                    // Update drag rectangle
                    dragRect.x = newX;
                    dragRect.y = newY;
                    dragRect.displayWidth = newWidth;
                    dragRect.displayHeight = newHeight;

                    // Update outline
                    if (dragRect.outline) {
                        dragRect.outline.clear()
                            .lineStyle(2, 0x00ff00, 1)
                            .strokeRect(
                                -newWidth/2, 
                                -newHeight/2, 
                                newWidth, 
                                newHeight
                            );
                    }

                    // Update toggle text position
                    if (dragRect.toggleText) {
                        dragRect.toggleText.setPosition(newX, newY - newHeight/2 - 24);
                    }

                    // Update all resize handles
                    this.updateResizeHandles(dragRect, platform);
                });

                // Reset handle appearance after drag
                handle.on('dragend', () => {
                    handle.setDepth(1000);
                    handle.setScale(0.8);
                });

                // Add hover effect
                handle.on('pointerover', () => {
                    handle.setScale(1.0);
                });
                
                handle.on('pointerout', () => {
                    if (!handle.input.isDragged) {
                        handle.setScale(0.8);
                    }
                });

                dragRect.resizeHandles.push(handle);
                this.editorHandles.push(handle);
            });
        }

        // Position all handles
        this.updateResizeHandles(dragRect, platform);
    }

    updateResizeHandles(dragRect, platform) {
        if (!dragRect.resizeHandles) return;
        
        const platformWidth = platform.displayWidth;
        const platformHeight = platform.displayHeight;
        
        // Update handle positions based on current platform size
        dragRect.resizeHandles.forEach(handle => {
            let x = 0, y = 0;
            
            switch (handle.type) {
                case 'nw': x = -platformWidth/2; y = -platformHeight/2; break;
                case 'n': x = 0; y = -platformHeight/2; break;
                case 'ne': x = platformWidth/2; y = -platformHeight/2; break;
                case 'e': x = platformWidth/2; y = 0; break;
                case 'se': x = platformWidth/2; y = platformHeight/2; break;
                case 's': x = 0; y = platformHeight/2; break;
                case 'sw': x = -platformWidth/2; y = platformHeight/2; break;
                case 'w': x = -platformWidth/2; y = 0; break;
            }
            
            handle.x = platform.x + x;
            handle.y = platform.y + y;
            
            // Update original positions for next drag
            handle.originalX = x;
            handle.originalY = y;
        });
    }

    initEditor(width, height) {
        this.editorVisible = false;
        this.editorHandles = [];
        this.selectedPlatform = null;
        
        // Create editor UI elements
        this.editorNotice = this.add.text(width - 20, 20, 'EDITOR MODE', { 
            fontSize: '24px', 
            fill: '#ff0000',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(1, 0).setVisible(false);
        
        // Create save button
        this.saveButton = this.add.text(width - 20, 60, 'SAVE LAYOUT (D)', { 
            fontSize: '20px',
            fill: '#00ff00',
            backgroundColor: '#00000080',
            padding: { x: 10, y: 5 }
        })
        .setOrigin(1, 0)
        .setVisible(false)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.exportPlatformData(width, height));

        // Setup keyboard controls
        this.setupEditorControls();
        
        // Create drag handles for each platform
        this.platforms.children.iterate(plat => {
            if (!plat || plat === this.startPlatform) return;
            
            // Create a transparent drag handle that covers the platform
            const dragHandle = this.add.rectangle(
                plat.x, 
                plat.y, 
                plat.width, 
                plat.height,
                0x0000ff, 
                0.0
            ).setInteractive();
            
            // Create outline for the platform
            const outline = this.add.graphics()
                .lineStyle(2, 0x00ff00, 1)
                .strokeRect(
                    -plat.width/2, 
                    -plat.height/2, 
                    plat.width, 
                    plat.height
                )
                .setPosition(plat.x, plat.y)
                .setVisible(false);
                
            // Store references
            dragHandle.linkedPlatform = plat;
            dragHandle.outline = outline;
            plat.dragHandle = dragHandle;
            
            // Add to editor handles
            this.editorHandles.push(dragHandle, outline);
            this.input.setDraggable(dragHandle);
            
            // Handle platform dragging
            this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
                // Round to nearest pixel for crisp rendering
                const newX = Math.round(dragX);
                const newY = Math.round(dragY);
                
                // Update drag handle
                gameObject.x = newX;
                gameObject.y = newY;
                
                // Update platform position
                const plat = gameObject.linkedPlatform;
                plat.x = newX;
                plat.y = newY;
                plat.body.updateFromGameObject();
                
                // Update outline position
                const outline = gameObject.outline;
                outline.setPosition(newX, newY);
                
                // Update toggle text position if it exists
                if (gameObject.toggleText) {
                    gameObject.toggleText.setPosition(newX, newY - plat.height/2 - 24);
                }
                
                // Update resize handles if they exist
                if (gameObject.resizeHandles) {
                    this.updateResizeHandles(gameObject, plat);
                }
            });
            
            // Create resize handles (8 directions)
            this.createResizeHandles(dragHandle, plat);
            
            // Toggle visibility button
            const toggleText = this.add.text(
                plat.x,
                plat.y - plat.height / 2 - 20,
                plat.visible === false ? 'Hidden' : 'Visible',
                { 
                    fontSize: '16px', 
                    fill: '#ffffff',
                    backgroundColor: '#00000080',
                    padding: { x: 5, y: 2 },
                    stroke: '#000000',
                    strokeThickness: 2
                }
            )
            .setOrigin(0.5, 0.5)
            .setVisible(false)
            .setInteractive({ useHandCursor: true });
            
            toggleText.on('pointerdown', () => {
                plat.visible = !plat.visible;
                plat.body.enable = plat.visible;
                outline.setVisible(plat.visible && this.editorVisible);
                dragHandle.setVisible(plat.visible && this.editorVisible);

                if (dragRect.resizeHandles) {
                    dragRect.resizeHandles.forEach(handle => {
                        handle.setVisible(plat.visible && this.editorVisible);
                    });
                }

                toggleText.setText(plat.visible ? 'Visible' : 'Hidden');
            });
            
            dragHandle.toggleText = toggleText;
            this.editorHandles.push(toggleText);
            
            // Handle platform selection
            dragHandle.on('pointerdown', () => {
                this.selectedPlatform = plat;
            });
        });

        // Toggle editor mode with E key
        this.input.keyboard.on('keydown-E', (event) => {
            if (event.ctrlKey || event.metaKey) return;
            this.editorVisible = !this.editorVisible;
            this.editorNotice?.setVisible(this.editorVisible);
            this.saveButton?.setVisible(this.editorVisible);
            
            this.platforms.children.iterate(plat => {
                if (!plat || plat === this.startPlatform) return;
                
                // Toggle platform outline and drag handle
                if (plat.dragHandle) {
                    const dragHandle = plat.dragHandle;
                    const isVisible = this.editorVisible && plat.visible !== false;
                    
                    // Toggle outline and drag handle with null checks
                    if (dragHandle.outline) dragHandle.outline.setVisible(isVisible);
                    dragHandle.setVisible(isVisible);
                    
                    // Toggle resize handles
                    if (dragHandle.resizeHandles) {
                        dragHandle.resizeHandles.forEach(handle => {
                            if (handle) handle.setVisible(isVisible);
                        });
                    }
                    
                    // Toggle visibility text
                    if (dragHandle.toggleText) {
                        dragHandle.toggleText.setVisible(isVisible);
                    }
                }
            });
            
            // If exiting editor mode, hide all editor elements
            if (!this.editorVisible) {
                this.editorHandles.forEach(handle => {
                    if (handle && typeof handle.setVisible === 'function') {
                        handle.setVisible(false);
                    }
                });
            }
        });

        // Save layout with D key
        this.input.keyboard.on('keydown-D', (event) => {
            if (!this.editorVisible || event.ctrlKey) return;
            this.exportPlatformData(width, height);
            
            // Visual feedback
            const saveText = this.add.text(width / 2, height - 50, 'Layout Saved!', {
                fontSize: '32px',
                fill: '#00ff00',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: saveText,
                alpha: 0,
                duration: 1000,
                onComplete: () => saveText.destroy()
            });
        });

        // Delete platform with Delete key
        this.input.keyboard.on('keydown-DELETE', () => {
            if (!this.editorVisible || !this.selectedPlatform) return;
            
            const plat = this.selectedPlatform;
            
            // Remove all related editor elements
            if (plat.dragHandle) {
                // Remove resize handles
                if (plat.dragHandle.resizeHandles) {
                    plat.dragHandle.resizeHandles.forEach(handle => {
                        handle.destroy();
                        const index = this.editorHandles.indexOf(handle);
                        if (index > -1) {
                            this.editorHandles.splice(index, 1);
                        }
                    });
                }
                
                // Remove outline
                if (plat.dragHandle.outline) {
                    plat.dragHandle.outline.destroy();
                    const outlineIndex = this.editorHandles.indexOf(plat.dragHandle.outline);
                    if (outlineIndex > -1) {
                        this.editorHandles.splice(outlineIndex, 1);
                    }
                }
                
                // Remove toggle text
                if (plat.dragHandle.toggleText) {
                    plat.dragHandle.toggleText.destroy();
                    const textIndex = this.editorHandles.indexOf(plat.dragHandle.toggleText);
                    if (textIndex > -1) {
                        this.editorHandles.splice(textIndex, 1);
                    }
                }
                
                // Remove drag handle
                const handleIndex = this.editorHandles.indexOf(plat.dragHandle);
                if (handleIndex > -1) {
                    this.editorHandles.splice(handleIndex, 1);
                }
                plat.dragHandle.destroy();
            }
            
            // Remove platform from physics and game objects
            this.platforms.remove(plat, true, true);
            this.selectedPlatform = null;
        });

        // Duplicate platform with Ctrl+D
        this.input.keyboard.on('keydown-D', (event) => {
            if (!this.editorVisible || !this.selectedPlatform || !event.ctrlKey) return;
            
            const sourcePlat = this.selectedPlatform;
            const offset = 20; // Offset for the duplicate
            
            // Create new platform
            const newPlat = this.add.rectangle(
                sourcePlat.x + offset,
                sourcePlat.y + offset,
                sourcePlat.width,
                sourcePlat.height,
                0xffffff,
                0.5
            );
            
            // Add physics to the new platform
            this.physics.add.existing(newPlat, true);
            this.platforms.add(newPlat);
            
            // Create drag handle for the new platform
            const dragHandle = this.add.rectangle(
                newPlat.x, 
                newPlat.y, 
                newPlat.width, 
                newPlat.height,
                0x0000ff, 
                0.0
            ).setInteractive();
            
            // Create outline for the new platform
            const outline = this.add.graphics()
                .lineStyle(2, 0x00ff00, 1)
                .strokeRect(
                    -newPlat.width/2, 
                    -newPlat.height/2, 
                    newPlat.width, 
                    newPlat.height
                )
                .setPosition(newPlat.x, newPlat.y)
                .setVisible(this.editorVisible);
            
            // Store references
            dragHandle.linkedPlatform = newPlat;
            dragHandle.outline = outline;
            newPlat.dragHandle = dragHandle;
            
            // Add to editor handles
            this.editorHandles.push(dragHandle, outline);
            this.input.setDraggable(dragHandle);
            
            // Set up drag for the new platform
            this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
                const newX = Math.round(dragX);
                const newY = Math.round(dragY);
                
                gameObject.x = newX;
                gameObject.y = newY;
                
                // Update platform position
                const plat = gameObject.linkedPlatform;
                plat.x = newX;
                plat.y = newY;
                plat.body.updateFromGameObject();
                
                // Update outline position
                const outline = gameObject.outline;
                outline.setPosition(newX, newY);
                
                // Update toggle text position if it exists
                if (gameObject.toggleText) {
                    gameObject.toggleText.setPosition(newX, newY - plat.height/2 - 24);
                }
                
                // Update resize handles
                if (gameObject.resizeHandles) {
                    this.updateResizeHandles(gameObject, plat);
                }
            });
            
            // Create resize handles for the new platform
            this.createResizeHandles(dragHandle, newPlat);
            
            // Toggle visibility button for the new platform
            const toggleText = this.add.text(
                newPlat.x, 
                newPlat.y - newPlat.height/2 - 20, 
                'Visible', 
                { 
                    fontSize: '16px', 
                    fill: '#ffffff',
                    backgroundColor: '#00000080',
                    padding: { x: 5, y: 2 },
                    stroke: '#000000',
                    strokeThickness: 2
                }
            )
            .setOrigin(0.5, 0.5)
            .setVisible(this.editorVisible)
            .setInteractive({ useHandCursor: true });
            
            toggleText.on('pointerdown', () => {
                newPlat.visible = !newPlat.visible;
                newPlat.body.enable = newPlat.visible;
                outline.setVisible(newPlat.visible && this.editorVisible);
                dragHandle.setVisible(newPlat.visible && this.editorVisible);
                
                // Show/hide resize handles
                if (dragHandle.resizeHandles) {
                    dragHandle.resizeHandles.forEach(handle => {
                        handle.setVisible(newPlat.visible && this.editorVisible);
                    });
                }
                
                toggleText.setText(newPlat.visible ? 'Visible' : 'Hidden');
            });
            
            dragHandle.toggleText = toggleText;
            this.editorHandles.push(toggleText);
            
            // Select the new platform
            this.selectedPlatform = newPlat;
            
            // Set up click handler for selection
            dragHandle.on('pointerdown', () => {
                this.selectedPlatform = newPlat;
            });
        });
    }

    // Layout persistence handled by BaseLevel.

    initEditor(width, height) {
        return super.initEditor(width, height);
    }
}
