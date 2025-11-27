let backgroundTrack = null;
let hasStarted = false;
let isMuted = false;
let currentKey = null;
let pendingOptions = { volume: 0.5 };

const POINTER_EVENT = 'pointerdown';
const KEYDOWN_EVENT = 'keydown';
const SHUTDOWN_EVENT = 'shutdown';

function createTrack(scene, key, volume) {
    if (!scene?.sound) return null;
    if (backgroundTrack) {
        backgroundTrack.stop();
        backgroundTrack.destroy();
    }

    backgroundTrack = scene.sound.add(key, { loop: true, volume });
    backgroundTrack.setLoop(true);
    backgroundTrack.setVolume(volume);
    backgroundTrack.setMute(isMuted);
    currentKey = key;
    pendingOptions = { volume };
    return backgroundTrack;
}

export function ensureBackgroundMusic(scene, options = {}) {
    if (!scene || !scene.sound) {
        return null;
    }

    const {
        key = 'default-bgm',
        volume = 0.5
    } = options;

    if (!backgroundTrack || currentKey !== key) {
        createTrack(scene, key, volume);
    } else if (backgroundTrack) {
        backgroundTrack.setVolume(volume);
        backgroundTrack.setMute(isMuted);
        pendingOptions = { volume };
    }

    if (hasStarted) {
        if (!backgroundTrack.isPlaying && !isMuted) {
            backgroundTrack.play();
        }
        return backgroundTrack;
    }

    function cleanupListeners() {
        scene.input?.off(POINTER_EVENT, pointerHandler);
        scene.input?.keyboard?.off(KEYDOWN_EVENT, keyboardHandler);
        scene.events?.off(SHUTDOWN_EVENT, cleanupListeners);
    }

    function startPlayback() {
        hasStarted = true;
        if (backgroundTrack && !backgroundTrack.isPlaying && !isMuted) {
            backgroundTrack.play();
        }
        cleanupListeners();
    }

    const pointerHandler = () => startPlayback();
    const keyboardHandler = () => startPlayback();

    if (scene.input) {
        scene.input.once(POINTER_EVENT, pointerHandler);
    }

    if (scene.input?.keyboard) {
        scene.input.keyboard.once(KEYDOWN_EVENT, keyboardHandler);
    }

    scene.events?.once(SHUTDOWN_EVENT, cleanupListeners);

    return backgroundTrack;
}

export function toggleAudioMute(forceValue) {
    const nextState = typeof forceValue === 'boolean' ? forceValue : !isMuted;
    isMuted = nextState;

    if (backgroundTrack) {
        if (isMuted) {
            backgroundTrack.setMute(true);
            backgroundTrack.pause();
        } else {
            backgroundTrack.setMute(false);
            if (hasStarted) {
                if (backgroundTrack.isPaused) {
                    backgroundTrack.resume();
                } else if (!backgroundTrack.isPlaying) {
                    backgroundTrack.play();
                }
            }
        }
    }

    return isMuted;
}

export function isAudioMuted() {
    return isMuted;
}

export function stopBackgroundMusic() {
    if (backgroundTrack) {
        backgroundTrack.stop();
        hasStarted = false;
        backgroundTrack.destroy();
        backgroundTrack = null;
        currentKey = null;
    }
}
