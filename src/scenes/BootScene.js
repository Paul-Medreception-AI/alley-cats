export default class BootScene extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Load any assets needed for the preloader here
        this.load.image('logo', 'assets/images/logo.png');
    }

    create() {
        this.scene.start('Preloader');
    }
}
