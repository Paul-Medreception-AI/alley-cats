import Phaser from 'phaser';
import BootScene from './scenes/BootScene.js';
import Preloader from './scenes/Preloader.js';
import HomeScene from './scenes/HomeScene.js';
import MainMenu from './scenes/MainMenu.js';
import GameModeSelect from './scenes/GameModeSelect.js';
import HostOrJoin from './scenes/HostOrJoin.js';
import CharacterSelect from './scenes/CharacterSelect.js';
import JoinGame from './scenes/JoinGame.js';
import LevelSelect from './scenes/LevelSelect.js';
import GameScene from './scenes/GameScene.js';
import AlleywayLevel from './scenes/AlleywayLevel.js';
import CaveLevel from './scenes/CaveLevel.js';
import RiverLevel from './scenes/RiverLevel.js';

const config = {
    type: Phaser.AUTO,
    width: 1200,
    height: 700,
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: [BootScene, Preloader, HomeScene, MainMenu, GameModeSelect, HostOrJoin, JoinGame, CharacterSelect, LevelSelect, GameScene, AlleywayLevel, CaveLevel, RiverLevel],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    pixelArt: true,
    parent: 'game-container'
};

const game = new Phaser.Game(config);
