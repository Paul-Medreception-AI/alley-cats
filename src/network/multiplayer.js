import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:4000';
const DEFAULT_NAME = `Player-${Math.random().toString(36).slice(-4)}`;

class EventHub {
    constructor() {
        this.listeners = new Map();
    }

    on(event, handler) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        const bucket = this.listeners.get(event);
        bucket.add(handler);
        return () => bucket.delete(handler);
    }

    emit(event, payload) {
        const bucket = this.listeners.get(event);
        if (!bucket) return;
        bucket.forEach((handler) => handler(payload));
    }
}

class MultiplayerClient {
    constructor() {
        this.events = new EventHub();
        this.socket = null;
        this.socketId = null;
        this.roomCode = null;
        this.roomPlayers = [];
        this.playerMetadata = new Map();
        this.localMetadata = {};
        this.localName = DEFAULT_NAME;
        this.connectPromise = null;
    }

    setDisplayName(name) {
        if (name && name.trim()) {
            this.localName = name.trim();
            if (this.socket && this.socket.connected) {
                this.socket.auth = { ...(this.socket.auth || {}), name: this.localName };
            }
        }
    }

    isConnected() {
        return !!(this.socket && this.socket.connected);
    }

    isInRoom() {
        return this.isConnected() && !!this.roomCode;
    }

    ensureConnection(name) {
        if (name) this.setDisplayName(name);
        if (this.isConnected()) return Promise.resolve(this.socket);
        if (this.connectPromise) return this.connectPromise;

        this.connectPromise = new Promise((resolve, reject) => {
            this.socket = io(SERVER_URL, {
                transports: ['websocket', 'polling'],
                autoConnect: true,
                auth: { name: this.localName }
            });

            const onConnect = () => {
                this.socketId = this.socket.id;
                console.info('[Multiplayer] Connected as', this.socketId, 'name:', this.localName);
                this.registerSocketHandlers();
                this.connectPromise = null;
                resolve(this.socket);
            };

            const onError = (err) => {
                this.connectPromise = null;
                reject(err);
            };

            this.socket.once('connect', onConnect);
            this.socket.once('connect_error', onError);
        });

        return this.connectPromise;
    }

    registerSocketHandlers() {
        if (!this.socket) return;
        this.socket.on('room:players', (players) => {
            this.roomPlayers = players;
            console.info('[Multiplayer] room players updated', players);
            players.forEach((p) => {
                if (!this.playerMetadata.has(p.id)) {
                    this.playerMetadata.set(p.id, {});
                }
            });
            this.events.emit('room:players', players);
            if (this.isInRoom() && Object.keys(this.localMetadata || {}).length) {
                this.broadcast('player:metadata', this.localMetadata);
            }
        });

        this.socket.on('room:event', (payload) => {
            console.debug('[Multiplayer] room:event', payload);
            if (payload?.type === 'player:metadata') {
                this.updateMetadata(payload.from, payload.payload);
            }
            this.events.emit('room:event', payload);
        });

        this.socket.on('room:closed', () => {
            console.warn('[Multiplayer] room closed');
            this.roomCode = null;
            this.roomPlayers = [];
            this.events.emit('room:closed');
        });
    }

    createRoom(options = {}) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Not connected'));
                return;
            }
            this.socket.emit('host:createRoom', options, (response) => {
                if (!response?.ok) {
                    console.error('[Multiplayer] host:createRoom failed', response);
                    reject(new Error(response?.error || 'Failed to create room'));
                    return;
                }
                console.info('[Multiplayer] Room created', response.roomCode);
                this.roomCode = response.roomCode;
                this.roomPlayers = response.players || [];
                this.events.emit('room:players', this.roomPlayers);
                resolve(response);
            });
        });
    }

    joinRoom(code, payload = {}) {
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Not connected'));
                return;
            }
            this.socket.emit('player:joinRoom', { roomCode: code, ...payload }, (response) => {
                if (!response?.ok) {
                    console.error('[Multiplayer] player:joinRoom failed', response);
                    reject(new Error(response?.error || 'Failed to join room'));
                    return;
                }
                console.info('[Multiplayer] Joined room', response.roomCode);
                this.roomCode = response.roomCode;
                this.roomPlayers = response.players || [];
                this.events.emit('room:players', this.roomPlayers);
                resolve(response);
            });
        });
    }

    leaveRoom() {
        this.roomCode = null;
        this.roomPlayers = [];
    }

    broadcast(type, payload = {}) {
        if (!this.socket || !this.roomCode) return;
        this.socket.emit('room:broadcast', {
            roomCode: this.roomCode,
            type,
            payload
        });
    }

    on(event, handler) {
        return this.events.on(event, handler);
    }

    getPlayers() {
        return this.roomPlayers;
    }

    getPlayerMetadata(id) {
        return this.playerMetadata.get(id) || {};
    }

    getLocalId() {
        return this.socketId;
    }

    setLocalMetadata(metadata = {}) {
        this.localMetadata = { ...this.localMetadata, ...metadata };
        if (this.socketId) {
            this.playerMetadata.set(this.socketId, this.localMetadata);
        }
        if (this.isInRoom()) {
            this.broadcast('player:metadata', this.localMetadata);
        } else if (this.socket) {
            this.socket.once('connect', () => {
                if (this.socketId) {
                    this.playerMetadata.set(this.socketId, this.localMetadata);
                }
                this.broadcast('player:metadata', this.localMetadata);
            });
        }

    }

    updateMetadata(id, metadata = {}) {
        const current = this.playerMetadata.get(id) || {};
        const merged = { ...current, ...metadata };
        this.playerMetadata.set(id, merged);
        this.events.emit('player:metadata', { id, metadata: merged });
    }
}

export const multiplayer = new MultiplayerClient();
