import Phaser from 'phaser';
import { ensureBackgroundMusic, isAudioMuted, toggleAudioMute } from './audioManager.js';

const LABEL_STYLE = {
    fontSize: '20px',
    fill: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.35)',
    padding: { x: 10, y: 4 },
    fontFamily: 'Arial',
    stroke: '#000000',
    strokeThickness: 2
};

export function addAudioToggle(scene, options = {}) {
    const { x = 90, y = 50 } = options;

    const label = scene.add.text(x, y, 'Audio', LABEL_STYLE)
        .setOrigin(1, 0.5)
        .setScrollFactor(0)
        .setDepth(1000);

    const icon = scene.add.image(x + 12, y, isAudioMuted() ? 'toggle-off' : 'toggle-on')
        .setDisplaySize(80, 36)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(1000)
        .setInteractive({ useHandCursor: true });

    const updateIcon = () => {
        icon.setTexture(isAudioMuted() ? 'toggle-off' : 'toggle-on');
    };

    icon.on('pointerdown', () => {
        const muted = toggleAudioMute();
        updateIcon();
        if (!muted) {
            ensureBackgroundMusic(scene);
        }
    });

    const cleanup = () => {
        label.destroy();
        icon.destroy();
    };

    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, cleanup);
    scene.events.once(Phaser.Scenes.Events.DESTROY, cleanup);

    return { label, icon, updateIcon };
}
