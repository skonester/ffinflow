import type { BrowserWindow, IpcMain, IpcMainEvent } from "electron";

export function registerWindowIpc(ipcMain: IpcMain, getWindow: () => BrowserWindow | null | undefined): void {
  const getLiveWindow = (event: IpcMainEvent): BrowserWindow | undefined => {
    const window = getWindow();
    if (!window || window.isDestroyed()) return;
    const contents = window.webContents;
    if (contents.isDestroyed() || event.sender !== contents) return;
    return window;
  };

  ipcMain.on("toggle-menu-bar", (event, show: boolean) => {
    const window = getLiveWindow(event);
    if (!window) return;
    window.setMenuBarVisibility(show);
    window.setAutoHideMenuBar(!show);
  });

  ipcMain.on("enforce-min-size", (event, dimensions: { width: number; height: number }) => {
    const window = getLiveWindow(event);
    if (!window) return;
    window.setMinimumSize(dimensions.width, dimensions.height);
  });
}
