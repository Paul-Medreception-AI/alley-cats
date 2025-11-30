import { multiplayer } from './multiplayer.js';

const STATE_EVENT = 'game:state';

class StateSync {
    constructor() {
        this.scene = null;
        this.playerSnapshot = null;
        this.reconcileFn = null;
        this.unsubscribe = null;
        this.lastBroadcast = 0;
    }

    attach(scene, playerProvider, reconcileFn) {
        this.detach();
        this.scene = scene;
        this.playerSnapshot = playerProvider;
        this.reconcileFn = reconcileFn;
        this.unsubscribe = multiplayer.on('room:event', (evt) => {
            if (evt?.type === STATE_EVENT) {
                this.reconcileFn?.(evt.payload);
            }
        });
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.detach());
    }

    detach() {
        this.unsubscribe?.();
        this.unsubscribe = null;
        this.scene = null;
        this.playerSnapshot = null;
        this.reconcileFn = null;
    }

    broadcast(force = false) {
        if (!this.scene || !multiplayer.isInRoom()) return;
        const now = this.scene.time.now;
        if (!force && now - this.lastBroadcast < 80) return;
        this.lastBroadcast = now;
        const snapshot = this.playerSnapshot?.();
        if (!snapshot) return;
        multiplayer.broadcast(STATE_EVENT, snapshot);
    }
}

export const stateSync = new StateSync();
