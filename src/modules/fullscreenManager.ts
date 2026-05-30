const { ipcRenderer } = require("electron");
const { getCurrentWindow } = require("@electron/remote");

// Keep track of the active window object
const win = getCurrentWindow();

// Synchronize UI state on entering fullscreen
win.on("enter-full-screen", () => {
  (window as any).isFullscreen = true;
  ipcRenderer.send("toggle-menu-bar", false);
  
  const btn = document.getElementById("fullscreen");
  if (btn) {
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3"></path><path d="M21 8h-3a2 2 0 0 1-2-2V3"></path><path d="M3 16h3a2 2 0 0 1 2 2v3"></path><path d="M16 21v-3a2 2 0 0 1 2-2h3"></path></svg>`;
  }
  
  if (typeof (window as any).showControls === "function") {
    (window as any).showControls();
  }
});

// Synchronize UI state on leaving fullscreen
win.on("leave-full-screen", () => {
  (window as any).isFullscreen = false;
  ipcRenderer.send("toggle-menu-bar", true);
  
  const btn = document.getElementById("fullscreen");
  if (btn) {
    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"></path><path d="M21 8V5a2 2 0 0 0-2-2h-3"></path><path d="M3 16v3a2 2 0 0 0 2 2h3"></path><path d="M16 21h3a2 2 0 0 0 2-2v-3"></path></svg>`;
  }
  
  if ((window as any).controlsTimeout) {
    clearTimeout((window as any).controlsTimeout);
  }
  
  if (typeof (window as any).showControls === "function") {
    (window as any).showControls();
  }
});

function toggleFullscreen() {
  const windowObj = getCurrentWindow();
  const nextState = !windowObj.isFullScreen();
  windowObj.setFullScreen(nextState);
}

function handleFullscreenChange() {
  // Deprecated - state is managed via native Electron window events above.
  // Left for backward compatibility with DOM triggers.
}

function isFullscreenSupported() {
  return true; // Desktop windows always support fullscreen
}

module.exports = {
  isFullscreenSupported,
  handleFullscreenChange,
  toggleFullscreen,
};

export {};
