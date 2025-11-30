const STORAGE_KEY = 'alleycats:playerName';

export function getStoredPlayerName() {
    if (typeof window === 'undefined') return '';
    return window.localStorage.getItem(STORAGE_KEY) || '';
}

export function setStoredPlayerName(name) {
    if (typeof window === 'undefined') return;
    if (name && name.trim()) {
        window.localStorage.setItem(STORAGE_KEY, name.trim());
    }
}

export function promptForPlayerName(defaultName = '') {
    if (typeof window === 'undefined') return defaultName || `Player-${Math.random().toString(36).slice(-4)}`;
    const existing = getStoredPlayerName() || defaultName || `Player-${Math.random().toString(36).slice(-4)}`;
    const input = window.prompt('Enter a display name', existing);
    const finalName = (input !== null ? input : existing).trim() || existing || `Player-${Math.random().toString(36).slice(-4)}`;
    setStoredPlayerName(finalName);
    return finalName;
}
