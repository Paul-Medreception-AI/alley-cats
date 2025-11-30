// Check if the device is a mobile device
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if the device is in portrait mode
export function isPortrait() {
    return window.innerHeight > window.innerWidth;
}

// Check if the device supports touch events
export function isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0;
}

// Get the device pixel ratio
export function getPixelRatio() {
    return window.devicePixelRatio || 1;
}
