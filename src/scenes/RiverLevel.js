import BaseLevel from './BaseLevel';
import { addAudioToggle } from '../audioToggleUI.js';

const RIVER_DEFAULT_LAYOUT = [
    { x: 0.12916666666666668, y: 0.8485714285714285, width: 146.17596508634756, height: 30, visible: false },
    { x: 0.17916666666666667, y: 0.27285714285714285, width: 326.47420305748005, height: 196.05826703100718, visible: true },
    { x: 0.7675, y: 0.8357142857142857, width: 82.75416828160627, height: 22, visible: false },
    { x: 0.2875, y: 0.8642857142857143, width: 110.30649611640575, height: 21, visible: false },
    { x: 0.6408333333333334, y: 0.3157142857142857, width: 264.0207516821431, height: 219.76118846384944, visible: true },
    { x: 0.5983333333333334, y: 0.8671428571428571, width: 71.56762852313503, height: 22, visible: false },
    { x: 0.5208333333333334, y: 0.4957142857142857, width: 145.3119359141648, height: 114.92820092957732, visible: true },
    { x: 0.9766666666666667, y: 0.7828571428571428, width: 102.3864306533078, height: 22, visible: false }
];

const RIVER_DEFAULT_SPAWNS = [
    { x: 0.06623538433562778, y: 0.2649329589356134 },
    { x: 0.08373586526386194, y: 0.2553451286809745 },
    { x: 0.08786659392989073, y: 0.26714553514822237 },
    { x: 0.09674142823734722, y: 0.24723234923474155 },
    { x: 0.09957830991025936, y: 0.2833710940406883 }
];

export default class RiverLevel extends BaseLevel {
    constructor() {
        super('RiverLevel');
        this.lightningActive = false;
        this.totalRounds = 5;
        this.round = 1;
        this.scores = { host: 0, opponent: 0 };
    }

    init(data) {
        this.joinCode = data?.joinCode || '';
        this.connectionType = data?.connectionType || 'host';
        this.character = data?.character || 'Joy';
        this.playerCount = data?.playerCount || 1;
        this.falls = 0;
        this.roundEnded = false;
        this.round = data?.round || 1;
        this.scores = data?.scores || { host: 0, opponent: 0 };
    }

    preload() {
        super.preloadCommon();
        this.load.image('river-clouds', 'assets/images/riverclouds.jpg');
        this.load.image('river-lightning', 'assets/images/riverlightning.jpg');
    }

    create() {
        const { width, height } = this.scale;
        this.initializeSpawnPoints(width, height);
        this.startPosition = this.getSpawnPoint(0);
        
        // Create backgrounds
        this.bgClouds = this.add.image(0, 0, 'river-clouds')
            .setOrigin(0, 0)
            .setScrollFactor(0);
        
        this.bgLightning = this.add.image(0, 0, 'river-lightning')
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setVisible(false);
        
        // Scale backgrounds to fit
        const scaleX = width / this.bgClouds.width;
        const scaleY = height / this.bgClouds.height;
        const scale = Math.max(scaleX, scaleY);
        this.bgClouds.setScale(scale);
        this.bgLightning.setScale(scale);
        
        this.physics.world.setBounds(0, 0, width, height);
        this.platforms = this.physics.add.staticGroup();
        this.createPlatforms(width, height);
        this.createPlayer();
        this.createGoal(width, height);
        this.createWater(width, height);
        this.createUI(width, height);
        this.cameras.main.setBounds(0, 0, width, height);
        this.cameras.main.startFollow(this.player);
        this.cursors = this.input.keyboard.createCursorKeys();
        
        addAudioToggle(this, { x: width - 90, y: 110 });

        // Initialize editor
        this.initEditor(width, height);
        this.setupMultiplayerSupport();
        this.setupMobileControls(width, height);
        this.startBackgroundAnimation();
    }

    createPlatforms(width, height) {
        const start = this.add.rectangle(width * 0.08, height * 0.2, 220, 30, 0x000000, 0);
        this.physics.add.existing(start, true);
        this.platforms.add(start);
        this.startPlatform = start;
        this.disableStartPlatformCollision(this.startPlatform);

        RIVER_DEFAULT_LAYOUT.forEach(item => {
            const platWidth = item.width ?? 120;
            const platHeight = item.height ?? 22;
            const platX = item.x <= 1 ? item.x * width : item.x;
            const platY = item.y <= 1 ? item.y * height : item.y;
            const isVisible = item.visible !== false;
            const platform = this.add.rectangle(platX, platY, platWidth, platHeight, 0x000000, isVisible ? 1 : 0);
            this.physics.add.existing(platform, true);
            platform._isVisible = isVisible;
            platform.setVisible(isVisible);
            this.platforms.add(platform);
        });
    }

    createDefaultSpawnPoints() {
        return RIVER_DEFAULT_SPAWNS.map(sp => ({ ...sp }));
    }

    createPlayer() {
        const key = this.getCharacterTexture(this.character);
        this.player = this.physics.add.image(this.startPosition.x, this.startPosition.y, key)
            .setScale(0.05)
            .setBounce(0.1)
            .setCollideWorldBounds(true);
        const bodyWidth = this.player.width * 0.4;
        const bodyHeight = this.player.height * 0.5;
        this.player.body.setSize(bodyWidth, bodyHeight);
        this.player.body.setOffset((this.player.width - bodyWidth) / 2, this.player.height * 0.5);
        this.physics.add.collider(this.player, this.platforms);
        this.attachLocalPlayerLabel();
    }

    createGoal(width, height) {
        this.goal = this.add.rectangle(width - 100, height - 200, 80, 100, 0x00ff00, 0.3);
        this.physics.add.existing(this.goal, true);
        this.physics.add.overlap(this.player, this.goal, () => this.handleVictory());
    }

    createWater(width, height) {
        this.water = this.add.rectangle(width / 2, height - 15, width, 30, 0x0040ff, 0);
        this.physics.add.existing(this.water, true);
        this.physics.add.overlap(this.player, this.water, () => this.handleFall());
    }

    createUI(width, height) {
        this.roundText = this.add.text(16, 16, `Round ${this.round}/${this.totalRounds}`, {
            fontSize: '20px',
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 10, y: 6 }
        }).setScrollFactor(0);

        this.statusText = this.add.text(width / 2, height - 40, 'Hop across the river!', {
            fontSize: '22px',
            fill: '#fff',
            backgroundColor: 'rgba(0,0,0,0.6)',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setScrollFactor(0);

        const backButton = this.add.text(width - 120, 20, 'Back', {
            fontSize: '22px',
            fill: '#fff',
            backgroundColor: '#000',
            padding: { x: 10, y: 6 }
        }).setScrollFactor(0).setInteractive({ useHandCursor: true });

        backButton.on('pointerdown', () => this.returnToSelect());
    }

    startBackgroundAnimation() {
        this.time.addEvent({
            delay: 8000,
            loop: true,
            callback: () => {
                this.lightningActive = !this.lightningActive;
                this.bgClouds.setVisible(!this.lightningActive);
                this.bgLightning.setVisible(this.lightningActive);
                if (this.lightningActive) {
                    this.cameras.main.flash(200, 255, 255, 255);
                }
            }
        });
    }

    update() {
        if (this.roundEnded) return;
        const { left, right, jump } = this.getMovementInput();
        const speed = 230;
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
            this.player.setVelocityY(-420);
        }

        this.updateLocalNameLabel();
        this.broadcastPlayerState();
    }

    handleFall() {
        if (this.roundEnded) return;
        this.falls += 1;
        if (this.falls === 1) {
            this.statusText.setText('Splash! Respawning...');
            this.player.setPosition(this.startPosition.x, this.startPosition.y);
            this.player.setVelocity(0, 0);
        } else {
            this.roundEnded = true;
            this.statusText.setText('The river wins this time.');
            this.player.setTint(0x555555);
            this.player.setVelocity(0, 0);
            this.time.delayedCall(2000, () => this.advanceRound(false));
        }
    }

    handleVictory() {
        if (this.roundEnded) return;
        this.roundEnded = true;
        this.statusText.setText('You reached the far bank!');
        this.time.delayedCall(2000, () => this.advanceRound(true));
    }

    returnToSelect() {
        this.scene.start('GameScene', {
            joinCode: this.joinCode,
            connectionType: this.connectionType,
            playerCount: this.playerCount,
            character: this.character
        });
    }

    advanceRound(didWin) {
        if (didWin) {
            this.scores.host = (this.scores.host || 0) + 1;
        }

        const nextRound = (this.round || 1) + 1;
        if (nextRound > this.totalRounds) {
            this.statusText.setText('River challenge finished! Returning...');
            this.time.delayedCall(1500, () => {
                this.scene.start('GameScene', {
                    joinCode: this.joinCode,
                    connectionType: this.connectionType,
                    playerCount: this.playerCount,
                    character: this.character,
                    round: 1,
                    scores: { host: 0, opponent: 0 }
                });
            });
        } else {
            this.scene.restart({
                joinCode: this.joinCode,
                connectionType: this.connectionType,
                playerCount: this.playerCount,
                character: this.character,
                round: nextRound,
                scores: this.scores
            });
        }
    }

    getCharacterTexture(character) {
        const key = character?.toLowerCase() || 'joy';
        switch (key) {
            case 'iz': return 'character-iz';
            case 'liz': return 'character-liz';
            case 'lulu': return 'character-lulu';
            case 'milo': return 'character-milo';
            default: return 'character-joy';
        }
    }

    legacyCreateEditorHandles(plat) {
        // Create drag handle
        const dragHandle = this.add.rectangle(
            plat.x, 
            plat.y, 
            plat.width, 
            plat.height,
            0x0000ff, 
            0.0
        ).setInteractive();
        
        // Create outline for the platform (always visible when in editor mode)
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
        dragHandle.resizeHandles = [];
        plat.dragHandle = dragHandle;
        
        // Add to editor handles
        this.editorHandles.push(dragHandle, outline);
        this.input.setDraggable(dragHandle);
        
        // Create resize handles (8 directions)
        const handleSize = 16;
        const positions = [
            { x: -plat.width/2, y: -plat.height/2, angle: -45, type: 'nw' },
            { x: 0, y: -plat.height/2, angle: 0, type: 'n' },
            { x: plat.width/2, y: -plat.height/2, angle: 45, type: 'ne' },
            { x: plat.width/2, y: 0, angle: 90, type: 'e' },
            { x: plat.width/2, y: plat.height/2, angle: 135, type: 'se' },
            { x: 0, y: plat.height/2, angle: 180, type: 's' },
            { x: -plat.width/2, y: plat.height/2, angle: 225, type: 'sw' },
            { x: -plat.width/2, y: 0, angle: 270, type: 'w' }
        ];

        positions.forEach(pos => {
            const handle = this.add.sprite(0, 0, 'arrow')
                .setScale(0.8)
                .setVisible(false)
                .setInteractive({ useHandCursor: true })
                .setAngle(pos.angle)
                .setDepth(1000);

            handle.type = pos.type;
            handle.platform = plat;
            handle.dragRect = dragHandle;
            
            // Position the handle
            handle.x = plat.x + pos.x;
            handle.y = plat.y + pos.y;
            
            // Set up drag for resize handles
            this.input.setDraggable(handle);
            
            // Store initial positions on drag start
            handle.on('dragstart', () => {
                handle.startX = plat.x;
                handle.startY = plat.y;
                handle.startWidth = plat.displayWidth;
                handle.startHeight = plat.displayHeight;
                handle.startPointerX = this.input.activePointer.worldX;
                handle.startPointerY = this.input.activePointer.worldY;
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
                plat.x = newX;
                plat.y = newY;
                plat.displayWidth = newWidth;
                plat.width = newWidth;
                plat.displayHeight = newHeight;
                plat.height = newHeight;
                plat.body.setSize(newWidth, newHeight);
                plat.body.updateFromGameObject();

                // Update drag rectangle
                dragHandle.x = newX;
                dragHandle.y = newY;
                dragHandle.displayWidth = newWidth;
                dragHandle.displayHeight = newHeight;

                // Update outline
                outline.clear()
                    .lineStyle(2, 0x00ff00, 1)
                    .strokeRect(-newWidth/2, -newHeight/2, newWidth, newHeight)
                    .setPosition(newX, newY);

                // Update toggle text position
                if (dragHandle.toggleText) {
                    dragHandle.toggleText.setPosition(newX, newY - newHeight/2 - 24);
                }

                // Update all resize handles
                this.updateResizeHandles(dragHandle, plat);
            });

            // Reset handle appearance after drag
            handle.on('dragend', () => {
                handle.setDepth(1000);
                handle.setScale(0.8);
            });

            // Add hover effect
            handle.on('pointerover', () => handle.setScale(1.0));
            handle.on('pointerout', () => {
                if (!handle.input.isDragged) handle.setScale(0.8);
            });

            dragHandle.resizeHandles.push(handle);
            this.editorHandles.push(handle);
        });
        
        // Handle platform dragging
        this.input.on('drag', (pointer, gameObject, dragX, dragY) => {
            if (gameObject !== dragHandle) return;
            
            const newX = Math.round(dragX);
            const newY = Math.round(dragY);
            
            // Update drag handle
            gameObject.x = newX;
            gameObject.y = newY;
            
            // Update platform position
            plat.x = newX;
            plat.y = newY;
            plat.body.updateFromGameObject();
            
            // Update outline position
            outline.setPosition(newX, newY);
            
            // Update toggle text position if it exists
            if (dragHandle.toggleText) {
                dragHandle.toggleText.setPosition(newX, newY - plat.height/2 - 24);
            }
            
            // Update resize handles
            this.updateResizeHandles(dragHandle, plat);
        });
        
        // Toggle visibility button
        const toggleText = this.add.text(
            plat.x, 
            plat.y - plat.height/2 - 20, 
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
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
        
        toggleText.on('pointerdown', (e) => {
            e.stopPropagation();
            plat.visible = !plat.visible;
            plat.body.enable = plat.visible;
            // Always show outline in editor mode, even if platform is hidden
            outline.setVisible(this.editorVisible);
            // Only show drag handle and resize handles if platform is visible
            const showHandles = this.editorVisible && plat.visible;
            dragHandle.setVisible(showHandles);
            if (dragHandle.resizeHandles) {
                dragHandle.resizeHandles.forEach(h => h.setVisible(showHandles));
            }
            toggleText.setText(plat.visible ? 'Visible' : 'Hidden');
        });
        
        dragHandle.toggleText = toggleText;
        this.editorHandles.push(toggleText);
        
        // Handle platform selection
        dragHandle.on('pointerdown', () => {
            this.selectedPlatform = plat;
        });
    }
    
    updateResizeHandles(dragHandle, platform) {
        if (!dragHandle.resizeHandles) return;
        
        dragHandle.resizeHandles.forEach(handle => {
            let x = 0, y = 0;
            
            switch (handle.type) {
                case 'nw': x = -platform.width/2; y = -platform.height/2; break;
                case 'n': x = 0; y = -platform.height/2; break;
                case 'ne': x = platform.width/2; y = -platform.height/2; break;
                case 'e': x = platform.width/2; y = 0; break;
                case 'se': x = platform.width/2; y = platform.height/2; break;
                case 's': x = 0; y = platform.height/2; break;
                case 'sw': x = -platform.width/2; y = platform.height/2; break;
                case 'w': x = -platform.width/2; y = 0; break;
            }
            
            handle.x = platform.x + x;
            handle.y = platform.y + y;
        });
    }

    legacyLoadSavedLayout(width, height) {
        if (typeof window === 'undefined') return false;
        const saveKey = `level_${this.scene.key}_layout`;
        const raw = window.localStorage.getItem(saveKey);
        if (!raw) return false;

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            console.warn('[River Editor] Failed to parse saved layout', err);
            return false;
        }

        if (!Array.isArray(parsed) || !parsed.length) {
            return false;
        }

        const toRemove = [];
        this.platforms.children.iterate(plat => {
            if (plat && plat !== this.startPlatform) {
                toRemove.push(plat);
            }
        });
        toRemove.forEach(plat => {
            this.physics.world.disable(plat);
            this.platforms.remove(plat, true, true);
        });

        parsed.forEach(data => {
            const visible = data.visible !== false;
            const widthPx = data.width ?? 160;
            const heightPx = data.height ?? 22;
            const plat = this.add.rectangle(
                data.x * width,
                data.y * height,
                widthPx,
                heightPx,
                0x102a35,
                visible ? 0.9 : 0
            ).setVisible(visible);
            this.physics.add.existing(plat, true);
            plat.body.enable = visible;
            this.platforms.add(plat);
        });

        console.log(`[River Editor] Loaded ${parsed.length} platforms from ${saveKey}`);
        return true;
    }

    legacySetupEditorControls() {
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
                    
                    // Toggle outline and drag handle
                    dragHandle.outline?.setVisible(isVisible);
                    dragHandle.setVisible(isVisible);
                    
                    // Toggle resize handles
                    if (dragHandle.resizeHandles) {
                        dragHandle.resizeHandles.forEach(handle => {
                            handle.setVisible(isVisible);
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
            this.exportPlatformData(this.scale.width, this.scale.height);
            
            // Visual feedback
            const saveText = this.add.text(this.scale.width / 2, this.scale.height - 50, 'Layout Saved!', {
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
    }

    legacyExportPlatformData(viewWidth, viewHeight) {
        const result = [];
        this.platforms.children.iterate((plat) => {
            if (!plat || plat === this.startPlatform) return;
            const width = plat.width ?? plat.displayWidth ?? 160;
            const height = plat.height ?? plat.displayHeight ?? 22;
            result.push({
                x: Number((plat.x / viewWidth).toFixed(4)),
                y: Number((plat.y / viewHeight).toFixed(4)),
                width: Number(width.toFixed(1)),
                height: Number(height.toFixed(1)),
                visible: plat.visible !== false
            });
        });
        
        const saveKey = `level_${this.scene.key}_layout`;
        try {
            window.localStorage.setItem(saveKey, JSON.stringify(result));
            console.log(`[River Editor] Saved ${result.length} platforms to ${saveKey}`);
        } catch (err) {
            console.warn('[River Editor] Failed to save layout', err);
        }
        return result;
    }
}
