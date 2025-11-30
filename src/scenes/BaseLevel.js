import Phaser from 'phaser';
import { multiplayer } from '../network/multiplayer.js';
import { stateSync } from '../network/stateSync.js';
import { isMobile } from '../utils/device.js';
export default class BaseLevel extends Phaser.Scene {
    constructor(key) {
        super(key);
        this.spawnPointsNormalized = [];
        this.spawnPointMarkers = [];
        this.sceneWidth = 0;
        this.sceneHeight = 0;
        this.spawnSaveKey = '';
        this.spawnDropOffset = 60;
        this.mobileControlsEnabled = false;
        this.mobileControlsInitialized = false;
        this.mobileInput = { left: false, right: false, jumpQueued: false };
        this.mobileMovementPointers = new Map();
        this.mobileJumpPointers = new Set();
        this.mobileControlActivationY = 0;
        this.remotePlayers = new Map();
        this.multiplayerCleanup = [];
        this.lastStateBroadcast = 0;
        this.localNameLabel = null;
        this.playerListText = null;
        this.lastStartBroadcast = 0;
        
        // New UI elements
        this.movementFeedback = null;
        this.movementActive = false;
        this.helpOverlay = null;
        this.pauseMenu = null;
        this.isPaused = false;
    }

    // Common editor functionality for all levels
    loadSavedLayout(width, height) {
        const saveKey = `level_${this.scene.key}_layout`;
        console.log('Loading layout from:', saveKey);
        const savedData = localStorage.getItem(saveKey);
        
        if (savedData) {
            try {
                const platformData = JSON.parse(savedData);
                
                // Clear existing platforms (except start platform)
                const platformsToRemove = [];
                this.platforms.children.iterate(plat => {
                    if (plat && plat !== this.startPlatform) {
                        platformsToRemove.push(plat);
                    }
                });
                
                platformsToRemove.forEach(plat => {
                    this.physics.world.disable(plat);
                    this.platforms.remove(plat, true, true);
                });
                
                // Create platforms from saved data
                platformData.forEach(platData => {
                    const plat = this.add.rectangle(
                        platData.x * width,
                        platData.y * height,
                        platData.width,
                        platData.height || 20,
                        0x000000,
                        platData.visible ? 1 : 0
                    );
                    
                    this.physics.add.existing(plat, true);
                    plat._isVisible = platData.visible !== false;
                    plat.setVisible(plat._isVisible !== false);
                    this.platforms.add(plat);
                    
                    // Create editor handles for the new platform
                    this.createEditorHandles(plat);
                });
                
                console.log('Loaded saved layout:', platformData);
                return true;
            } catch (error) {
                console.error('Error loading saved layout:', error);
                return false;
            }
        }
        return false;
    }

    initEditor(width, height) {
        this.editorVisible = false;
        this.editorHandles = [];
        this.selectedPlatform = null;
        
        // Create editor UI elements
        this.createEditorUI(width, height);
        
        // Setup keyboard controls
        this.setupEditorControls();
        
        // Try to load saved layout first
        const loaded = this.loadSavedLayout(width, height);
        
        // If no saved layout, create handles for existing platforms
        if (!loaded) {
            this.platforms.children.iterate(plat => {
                if (!plat || plat === this.startPlatform) return;
                this.createEditorHandles(plat);
            });
        }

        this.createSpawnPointMarkers(width, height);
    }

    createEditorUI(width, height) {
        // Editor notice
        this.editorNotice = this.add.text(width / 2, 20, 'EDITOR MODE', {
            fontSize: '24px',
            fill: '#ff0000',
            backgroundColor: '#00000080',
            padding: { x: 10, y: 5 },
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        })
        .setOrigin(0.5, 0)
        .setVisible(false);
        
        // Add Platform button
        this.addPlatformButton = this.add.text(20, 20, 'ADD PLATFORM', {
            fontSize: '20px',
            fill: '#ffffff',
            backgroundColor: '#1a73e8',
            padding: { x: 15, y: 8 },
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setVisible(false)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.addNewPlatform(width, height));

        this.deletePlatformButton = this.add.text(220, 20, 'DELETE SELECTED', {
            fontSize: '20px',
            fill: '#ffffff',
            backgroundColor: '#b91c1c',
            padding: { x: 15, y: 8 },
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setVisible(false)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.deleteSelectedPlatform());

        // Editor toggle button
        this.editorToggleButton = this.add.text(width / 2 - 80, 20, 'EDITOR (E)', {
            fontSize: '20px',
            fill: '#ffffff',
            backgroundColor: '#b91c1c',
            padding: { x: 12, y: 6 },
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        })
        .setOrigin(0.5, 0)
        .setScrollFactor(0)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.toggleEditorMode());
        
        // Save button
        this.saveButton = this.add.text(width - 20, 20, 'SAVE (D)', {
            fontSize: '20px',
            fill: '#ffffff',
            backgroundColor: '#1a73e8',
            padding: { x: 10, y: 5 },
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 2
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setVisible(false)
        .setInteractive({ useHandCursor: true })
        .on('pointerdown', () => this.exportPlatformData(width, height));
    }

    createEditorHandles(plat) {
        if (typeof plat._isVisible === 'undefined') {
            plat._isVisible = plat.visible !== false;
        }

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
            const handle = this.createArrow()
                .setVisible(false)
                .setInteractive({ useHandCursor: true })
                .setScale(0.8, 1)
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
        .setDepth(1000)
        .setVisible(false)
        .setInteractive({ useHandCursor: true });
        
        // Store the platform's visibility state
        plat._isVisible = plat._isVisible !== false;
        
        // Function to update platform visibility
        const updatePlatformVisibility = () => {
            const isVisible = plat._isVisible;
            
            if (plat.body) {
                plat.body.enable = true;
                plat.body.updateFromGameObject();
            }

            const showPlatform = this.editorVisible ? true : isVisible;
            plat.setVisible(showPlatform);
            plat.fillAlpha = this.editorVisible ? (isVisible ? 0.6 : 0.2) : (isVisible ? 1 : 0);
            outline.setVisible(this.editorVisible);
            outline.alpha = isVisible ? 1 : 0.5;
            
            // Update toggle text
            toggleText.setText(isVisible ? 'Visible' : 'Hidden');
            toggleText.setStyle({
                fill: isVisible ? '#bbf7d0' : '#fecaca',
                backgroundColor: isVisible ? '#14532d' : '#7f1d1d'
            });
            toggleText.setPosition(plat.x, plat.y - plat.height/2 - 20);
            
            // Update handle visibility in editor mode
            if (this.editorVisible) {
                dragHandle.setVisible(true);
                if (dragHandle.resizeHandles) {
                    dragHandle.resizeHandles.forEach(h => h.setVisible(true));
                }
                toggleText.setVisible(true);
            } else {
                dragHandle.setVisible(false);
                if (dragHandle.resizeHandles) {
                    dragHandle.resizeHandles.forEach(h => h.setVisible(false));
                }
                toggleText.setVisible(false);
            }
            
            // Make sure toggle text is always on top
            this.children.bringToTop(toggleText);
        };
        
        // Set up the click handler
        toggleText.on('pointerdown', () => {
            plat._isVisible = !plat._isVisible;
            updatePlatformVisibility();
        });
        
        // Initialize visibility
        updatePlatformVisibility();
        
        dragHandle.toggleText = toggleText;
        plat._applyVisibility = updatePlatformVisibility;
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

    addNewPlatform(width, height) {
        if (!this.editorVisible) return;
        
        // Create a new platform in the center of the screen
        const centerX = width / 2;
        const centerY = height / 2;
        const platformWidth = 200;
        const platformHeight = 20;
        
        // Create the platform
        const plat = this.add.rectangle(
            centerX,
            centerY,
            platformWidth,
            platformHeight,
            0x000000,
            1
        );
        plat.fillAlpha = 1;
        
        // Add physics
        this.physics.add.existing(plat, true);
        this.platforms.add(plat);
        
        // Create editor handles
        this.createEditorHandles(plat);
        
        // Make it draggable immediately
        this.selectedPlatform = plat;
        
        // Visual feedback
        const flashTween = this.tweens.add({
            targets: plat,
            alpha: { from: 0.5, to: 0.3 },
            duration: 500,
            ease: 'Power1',
            onComplete: () => {
                plat.fillAlpha = 1; // Keep newly added platforms solid black
            }
        });
    }

    setupEditorControls() {
        // Toggle editor mode with E key
        this.input.keyboard.on('keydown-E', () => this.toggleEditorMode());

        // Save layout with D key
        this.input.keyboard.on('keydown-D', (event) => {
            if (!this.editorVisible || event.ctrlKey) return;
            this.exportPlatformData(this.scale.width, this.scale.height);
            
            // Visual feedback
            const saveText = this.add.text(this.scale.width / 2, this.scale.height - 50, 'Layout Saved!', {
                fontSize: '32px',
                fill: '#00ff00',
                backgroundColor: '#00000080',
                padding: { x: 10, y: 5 }
            })
            .setOrigin(0.5, 0.5)
            .setDepth(1000);
            
            this.time.delayedCall(2000, () => {
                saveText.destroy();
            });
        });

        // Delete selected platform with Delete key
        this.input.keyboard.on('keydown-DELETE', () => this.deleteSelectedPlatform());
    }

    toggleEditorMode(forceState) {
        const nextState = typeof forceState === 'boolean' ? forceState : !this.editorVisible;
        this.editorVisible = nextState;

        const buttonColor = nextState ? '#15803d' : '#b91c1c';
        this.editorToggleButton?.setStyle({ backgroundColor: buttonColor });

        this.editorNotice?.setVisible(nextState);
        this.saveButton?.setVisible(nextState);
        this.addPlatformButton?.setVisible(nextState);
        this.deletePlatformButton?.setVisible(nextState);
        this.deletePlatformButton?.setVisible(nextState);

        this.platforms.children.iterate(plat => {
            if (!plat || plat === this.startPlatform) return;
            plat._applyVisibility?.();
        });

        this.spawnPointMarkers?.forEach(marker => {
            marker.setVisible(nextState);
            marker.label?.setVisible(nextState);
        });

        if (!nextState) {
            this.editorHandles.forEach(handle => handle.setVisible(false));
        }
    }

    deleteSelectedPlatform() {
        if (!this.editorVisible || !this.selectedPlatform) return;
        const plat = this.selectedPlatform;
        if (plat === this.startPlatform) return;
        
        if (plat.dragHandle) {
            if (plat.dragHandle.outline) plat.dragHandle.outline.destroy();
            if (plat.dragHandle.toggleText) plat.dragHandle.toggleText.destroy();
            if (plat.dragHandle.resizeHandles) {
                plat.dragHandle.resizeHandles.forEach(h => h.destroy());
            }
            this.editorHandles = this.editorHandles.filter(h => 
                h !== plat.dragHandle && 
                h !== plat.dragHandle.outline &&
                !plat.dragHandle.resizeHandles?.includes(h) &&
                h !== plat.dragHandle.toggleText
            );
            plat.dragHandle.destroy();
        }
        
        this.physics.world.disable(plat);
        this.platforms.remove(plat, true, true);
        this.selectedPlatform = null;
    }

    initializeSpawnPoints(width, height) {
        this.sceneWidth = width;
        this.sceneHeight = height;
        this.spawnSaveKey = `level_${this.scene.key}_spawn`;
        const saved = this.loadSpawnPoints();
        if (saved && saved.length === 5) {
            this.spawnPointsNormalized = saved;
        } else {
            this.spawnPointsNormalized = this.createDefaultSpawnPoints();
        }
    }

    createDefaultSpawnPoints() {
        const points = [];
        for (let i = 0; i < 5; i++) {
            points.push({
                x: (80 + i * 80) / (this.sceneWidth || 1),
                y: 60 / (this.sceneHeight || 1)
            });
        }
        return points;
    }

    disableStartPlatformCollision(platform) {
        if (platform?.body) {
            platform.body.checkCollision.none = true;
            platform.body.enable = false;
        }
    }

    getSpawnPoint(index = 0, applyDropOffset = true) {
        const data = this.spawnPointsNormalized?.[index];
        const width = this.sceneWidth || this.scale.width;
        const height = this.sceneHeight || this.scale.height;
        const fallbackX = width ? width * 0.1 : 0;
        const fallbackY = height ? Math.max(16, height * 0.1) : 60;
        if (!data || !width || !height) {
            return { x: fallbackX, y: fallbackY };
        }
        const baseX = data.x * width;
        const baseY = data.y * height;
        const dropOffset = applyDropOffset ? (this.spawnDropOffset ?? Math.max(40, height * 0.05)) : 0;
        return {
            x: baseX,
            y: Math.max(16, baseY - dropOffset)
        };
    }

    createSpawnPointMarkers(width, height) {
        if (!this.spawnPointsNormalized?.length) return;
        if (this.spawnPointMarkers?.length) {
            this.spawnPointMarkers.forEach(marker => {
                marker.label?.destroy();
                marker.destroy();
            });
        }
        this.spawnPointMarkers = this.spawnPointsNormalized.map((sp, index) => {
            const worldX = sp.x * width;
            const worldY = sp.y * height;
            const marker = this.add.circle(worldX, worldY, 16, 0x2563eb, 0.7)
                .setStrokeStyle(2, 0xffffff)
                .setDepth(1000)
                .setVisible(false)
                .setScrollFactor(0)
                .setInteractive({ useHandCursor: true, draggable: true });
            this.input.setDraggable(marker);

            const label = this.add.text(worldX, worldY, `${index + 1}`, {
                fontSize: '16px',
                fill: '#ffffff',
                fontStyle: 'bold',
                backgroundColor: '#00000099',
                padding: { x: 6, y: 2 }
            })
            .setOrigin(0.5)
            .setDepth(1001)
            .setVisible(false)
            .setScrollFactor(0);

            marker.label = label;
            this.input.setDraggable(marker);

            marker.on('drag', (pointer, dragX, dragY) => {
                const clampedX = Phaser.Math.Clamp(dragX, 16, width - 16);
                const clampedY = Phaser.Math.Clamp(dragY, 16, height - 16);
                marker.setPosition(clampedX, clampedY);
                label.setPosition(clampedX, clampedY);
                this.spawnPointsNormalized[index] = {
                    x: clampedX / width,
                    y: clampedY / height
                };
                if (index === 0) {
                    this.startPosition = this.getSpawnPoint(0);
                }
            });

            marker.on('dragend', () => this.saveSpawnPoints());
            return marker;
        });
    }

    saveSpawnPoints() {
        if (typeof window === 'undefined' || !this.spawnSaveKey) return;
        try {
            window.localStorage.setItem(this.spawnSaveKey, JSON.stringify(this.spawnPointsNormalized));
        } catch (err) {
            console.warn('Failed to save spawn points', err);
        }
    }

    loadSpawnPoints() {
        if (typeof window === 'undefined' || !this.spawnSaveKey) return null;
        const raw = window.localStorage.getItem(this.spawnSaveKey);
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length === 5) {
                return parsed;
            }
        } catch (err) {
            console.warn('Failed to parse spawn points', err);
        }
        return null;
    }

    exportPlatformData(width, height) {
        const platformData = [];
        
        this.platforms.children.iterate(plat => {
            if (!plat || plat === this.startPlatform) return;
            
            platformData.push({
                x: plat.x / width,
                y: plat.y / height,
                width: plat.width,
                height: plat.height || 20,
                visible: plat._isVisible !== false // Ensure boolean
            });
        });
        
        // Save to localStorage with the scene's key
        const saveKey = `level_${this.scene.key}_layout`;
        console.log('Saving layout to:', saveKey, platformData);
        localStorage.setItem(saveKey, JSON.stringify(platformData));
        this.saveSpawnPoints();
        
        // Show save confirmation
        const saveText = this.add.text(this.scale.width / 2, this.scale.height - 50, 'Layout Saved!', {
            fontSize: '24px',
            fill: '#00ff00',
            backgroundColor: '#00000080',
            padding: { x: 10, y: 5 },
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 4
        })
        .setOrigin(0.5, 0.5)
        .setDepth(1000);
        
        // Remove the text after 2 seconds
        this.time.delayedCall(2000, () => {
            saveText.destroy();
        });
        
        console.log('Saved layout to localStorage:', saveKey, platformData);
        return platformData;
    }

    disableStartPlatformCollision(platform) {
        if (platform?.body) {
            platform.body.checkCollision.none = true;
            platform.body.enable = false;
        }
    }

    setupMobileControls(width, height) {
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
            .setDepth(1002)
            .setVisible(true);
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

    setupMultiplayerSupport() {
        this.cleanupMultiplayerSupport();
        if (!multiplayer.isInRoom()) return;

        const unsubPlayers = multiplayer.on('room:players', (players) => this.syncRemotePlayers(players));
        const unsubEvents = multiplayer.on('room:event', (event) => this.handleRemoteEvent(event));
        const unsubMetadata = multiplayer.on('player:metadata', ({ id }) => this.refreshRemoteAppearance(id));
        this.multiplayerCleanup = [unsubPlayers, unsubEvents, unsubMetadata];

        this.syncRemotePlayers(multiplayer.getPlayers());
        const meta = { character: this.character, currentLevel: this.scene?.key };
        multiplayer.setLocalMetadata(meta);

        stateSync.attach(this, () => this.snapshotLocalPlayer(), (payload) => this.applyRemoteState(payload.id, payload));

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanupMultiplayerSupport());
    }

    attachLocalPlayerLabel() {
        if (!this.player) return;
        const localId = multiplayer.getLocalId();
        const metadata = localId ? multiplayer.getPlayerMetadata(localId) : {} ;
        const displayName = metadata.name || multiplayer.localName || 'You';
        if (this.localNameLabel) {
            this.localNameLabel.destroy();
        }
        this.localNameLabel = this.add.text(this.player.x, this.player.y - 40, displayName, {
            fontSize: '16px',
            fill: '#f8fafc',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(5);
        this.localNameLabel.setScrollFactor(1, 1);
    }

    updateLocalNameLabel() {
        if (!this.localNameLabel || !this.player) return;
        this.localNameLabel.setPosition(this.player.x, this.player.y - 40);
    }

    updatePlayerListDisplay(players = multiplayer.getPlayers()) {
        if (!players || !players.length) {
            this.playerListText?.setVisible(false);
            return;
        }
        if (!this.playerListText) {
            this.playerListText = this.add.text(16, 140, '', {
                fontSize: '16px',
                fill: '#e0f2fe',
                backgroundColor: 'rgba(0,0,0,0.4)',
                padding: { x: 10, y: 8 }
            }).setScrollFactor(0).setDepth(1002);
        }
        const lines = players.map((p, index) => {
            const name = this.getDisplayNameForId(p.id) || p.name || `Player ${index + 1}`;
            const prefix = p.isHost ? '★ ' : '• ';
            return `${prefix}${name}`;
        });
        this.playerListText.setText(['Players:'].concat(lines));
        this.playerListText.setVisible(true);
    }

    getDisplayNameForId(id) {
        if (!id) return '';
        const metadata = multiplayer.getPlayerMetadata(id);
        if (metadata?.name) return metadata.name;
        const players = multiplayer.getPlayers() || [];
        const record = players.find((p) => p.id === id);
        return record?.name || '';
    }

    cleanupMultiplayerSupport() {
        this.multiplayerCleanup.forEach((off) => off?.());
        this.multiplayerCleanup = [];
        this.remotePlayers.forEach(({ sprite, label }) => {
            sprite?.destroy();
            label?.destroy();
        });
        this.remotePlayers.clear();
        this.localNameLabel?.destroy();
        this.localNameLabel = null;
        this.playerListText?.destroy();
        this.playerListText = null;
        stateSync.detach();
    }

    handleRemoteEvent(event) {
        if (!event || event.from === multiplayer.getLocalId()) return;
        if (event.type === 'player:update') {
            this.applyRemoteState(event.from, event.payload);
        } else if (event.type === 'player:metadata') {
            this.refreshRemoteAppearance(event.from);
        }
    }

    syncRemotePlayers(players = []) {
        if (!players.length) {
            this.remotePlayers.forEach(({ sprite, label }) => {
                sprite?.destroy();
                label?.destroy();
            });
            this.remotePlayers.clear();
            this.updatePlayerListDisplay([]);
            return;
        }

        const remoteIds = new Set();
        const localId = multiplayer.getLocalId();
        players.forEach((player) => {
            if (player.id === localId) {
                multiplayer.updateMetadata(player.id, { name: player.name });
                return;
            }
            remoteIds.add(player.id);
            multiplayer.updateMetadata(player.id, { name: player.name });
            if (!this.remotePlayers.has(player.id)) {
                const avatar = this.spawnRemotePlayer(player.id);
                if (avatar) {
                    this.remotePlayers.set(player.id, avatar);
                }
            }
        });

        Array.from(this.remotePlayers.keys()).forEach((id) => {
            if (!remoteIds.has(id)) {
                const entry = this.remotePlayers.get(id);
                entry?.sprite?.destroy();
                entry?.label?.destroy();
                this.remotePlayers.delete(id);
            }
        });

        this.updatePlayerListDisplay(players);

        if (this.isHost && this.scene?.key && (this.remotePlayers.size || players.length > 1)) {
            const now = this.time.now;
            if (!this.lastStartBroadcast || now - this.lastStartBroadcast > 1000) {
                this.lastStartBroadcast = now;
                multiplayer.setLocalMetadata({ currentLevel: this.scene.key });
                multiplayer.broadcast('game:startLevel', { level: this.scene.key });
            }
        }
    }

    spawnRemotePlayer(playerId) {
        const metadata = multiplayer.getPlayerMetadata(playerId);
        const texture = this.getCharacterTexture(metadata.character || 'Joy');
        const x = this.startPosition?.x || 0;
        const y = this.startPosition?.y || 0;
        const sprite = this.add.sprite(x, y, texture);
        sprite.setScale(0.05);
        sprite.setDepth(4);
        sprite.setAlpha(0.85);
        const label = this.add.text(x, y - 40, metadata.name || 'Player', {
            fontSize: '16px',
            fill: '#f1f5f9',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(4);
        return { sprite, label };
    }

    refreshRemoteAppearance(playerId) {
        const entry = this.remotePlayers.get(playerId);
        if (!entry) return;
        const metadata = multiplayer.getPlayerMetadata(playerId);
        const texture = this.getCharacterTexture(metadata.character || 'Joy');
        if (entry.sprite.texture.key !== texture) {
            entry.sprite.setTexture(texture);
        }
        entry.label?.setText(metadata.name || 'Player');
    }

    applyRemoteState(playerId, state = {}) {
        const entry = this.remotePlayers.get(playerId);
        if (!entry) return;
        if (typeof state.x === 'number' && typeof state.y === 'number') {
            entry.sprite.setPosition(state.x, state.y);
            entry.label?.setPosition(state.x, state.y - 40);
        }
        if (typeof state.flipX === 'boolean') {
            entry.sprite.setFlipX(state.flipX);
        }
    }

    snapshotLocalPlayer() {
        if (!this.player) return null;
        return {
            id: multiplayer.getLocalId(),
            x: this.player.x,
            y: this.player.y,
            flipX: this.player.flipX
        };
    }

    broadcastPlayerState(force = false) {
        if (!this.player || !multiplayer.isInRoom()) return;
        stateSync.broadcast(force);
    }

    // Common preload for all levels
    preloadCommon() {
        // No need to preload arrow image, we'll create it programmatically
    }
    
    // Create a simple arrow shape
    createArrow() {
        const arrow = this.add.graphics();
        arrow.fillStyle(0x4CAF50, 0.8); // Green color with some transparency
        arrow.fillRect(-10, -2, 20, 4); // Simple rectangle as arrow
        return arrow;
    }
}
