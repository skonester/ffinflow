const { app, shell, ipcMain } = require('electron');
const { getCurrentTheme } = require('./modules/themes');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const store = new Store();
const { BrowserWindow } = require('electron');
const { setAsDefaultMediaPlayer } = require('./modules/fileAssociations');

const PROJECT_URL = 'https://github.com/skonester/ffinflow';

// Shows a themed in-app dialog (rendered in the window) instead of the native
// OS message box, so Help menu popups match the app's own dark UI.
function askRendererDialog(mainWindow, options) {
    return new Promise<{ response: number }>((resolve) => {
        ipcMain.once('app-dialog-response', (_event, result) => resolve(result));
        mainWindow.webContents.send('show-app-dialog', options);
    });
}

const createMenuTemplate = (mainWindow, updateCheckState = { manual: false }) => [
    {
        label: 'File',
        submenu: [
            {
                label: 'Open Files',
                accelerator: 'CmdOrCtrl+O',
                click: () => mainWindow.webContents.send('menu-open-files')
            },
            {
                label: 'Open Folder',
                accelerator: 'CmdOrCtrl+Shift+O',
                click: () => mainWindow.webContents.send('menu-open-folder')
            },
            {
                label: 'Clear Playlist',
                accelerator: 'CmdOrCtrl+Shift+C',
                click: () => mainWindow.webContents.send('menu-clear-playlist')
            },
            { type: 'separator' },
            {
                label: 'Convert Media...',
                accelerator: 'CmdOrCtrl+Shift+V',
                click: () => mainWindow.webContents.send('menu-convert-file')
            },
            {
                label: 'Download Media...',
                accelerator: 'CmdOrCtrl+Shift+D',
                click: () => mainWindow.webContents.send('menu-open-downloader')
            },
            { type: 'separator' },
            {
                label: 'Exit',
                accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Alt+F4',
                click: () => app.quit()
            }
        ]
    },
    {
        label: 'View',
        submenu: [
            {
                label: 'Toggle Media Info',
                accelerator: 'I',
                click: () => mainWindow.webContents.send('toggle-media-info')
            },
            { type: 'separator' },
            {
                label: 'Themes',
                submenu: [
                    {
                        label: 'Aurora Breeze (Default)',
                        type: 'radio',
                        checked: getCurrentTheme() === 'auroraBreeze',
                        click: () => mainWindow.webContents.send('change-theme', 'auroraBreeze')
                    },
                    {
                        label: 'Tokyo Night',
                        type: 'radio',
                        checked: getCurrentTheme() === 'tokyoNight',
                        click: () => mainWindow.webContents.send('change-theme', 'tokyoNight')
                    },
                    {
                        label: 'Catppuccin Mocha',
                        type: 'radio',
                        checked: getCurrentTheme() === 'catppuccinMocha',
                        click: () => mainWindow.webContents.send('change-theme', 'catppuccinMocha')
                    },
                    {
                        label: "Synthwave '84",
                        type: 'radio',
                        checked: getCurrentTheme() === 'synthwave84',
                        click: () => mainWindow.webContents.send('change-theme', 'synthwave84')
                    },
                    {
                        label: 'Nordic Frost',
                        type: 'radio',
                        checked: getCurrentTheme() === 'nordicFrost',
                        click: () => mainWindow.webContents.send('change-theme', 'nordicFrost')
                    },
                    {
                        label: 'Cyberpunk 2077',
                        type: 'radio',
                        checked: getCurrentTheme() === 'cyberpunk2077',
                        click: () => mainWindow.webContents.send('change-theme', 'cyberpunk2077')
                    },
                    {
                        label: 'Deep Abyss',
                        type: 'radio',
                        checked: getCurrentTheme() === 'deepAbyss',
                        click: () => mainWindow.webContents.send('change-theme', 'deepAbyss')
                    },
                    {
                        label: 'Rosé Pine',
                        type: 'radio',
                        checked: getCurrentTheme() === 'rosePine',
                        click: () => mainWindow.webContents.send('change-theme', 'rosePine')
                    },
                    {
                        label: 'Dracula',
                        type: 'radio',
                        checked: getCurrentTheme() === 'draculaVamp',
                        click: () => mainWindow.webContents.send('change-theme', 'draculaVamp')
                    },
                    {
                        label: 'Cosmos',
                        type: 'radio',
                        checked: getCurrentTheme() === 'cosmos',
                        click: () => mainWindow.webContents.send('change-theme', 'cosmos')
                    },
                    {
                        label: 'Neon Dreams',
                        type: 'radio',
                        checked: getCurrentTheme() === 'neonDreams',
                        click: () => mainWindow.webContents.send('change-theme', 'neonDreams')
                    },
                    {
                        label: 'Quantum Matrix',
                        type: 'radio',
                        checked: getCurrentTheme() === 'quantum',
                        click: () => mainWindow.webContents.send('change-theme', 'quantum')
                    },
                    {
                        label: 'Crystal Wave',
                        type: 'radio',
                        checked: getCurrentTheme() === 'crystalWave',
                        click: () => mainWindow.webContents.send('change-theme', 'crystalWave')
                    },
                    {
                        label: 'Emerald Forest',
                        type: 'radio',
                        checked: getCurrentTheme() === 'emeraldForest',
                        click: () => mainWindow.webContents.send('change-theme', 'emeraldForest')
                    },
                    {
                        label: 'Blood Moon',
                        type: 'radio',
                        checked: getCurrentTheme() === 'bloodMoon',
                        click: () => mainWindow.webContents.send('change-theme', 'bloodMoon')
                    },
                    {
                        label: 'Crimson Night',
                        type: 'radio',
                        checked: getCurrentTheme() === 'crimsonNight',
                        click: () => mainWindow.webContents.send('change-theme', 'crimsonNight')
                    },
                    {
                        label: 'Solar Flare',
                        type: 'radio',
                        checked: getCurrentTheme() === 'solarFlare',
                        click: () => mainWindow.webContents.send('change-theme', 'solarFlare')
                    },
                    {
                        label: 'Classic Orange',
                        type: 'radio',
                        checked: getCurrentTheme() === 'defaultOrange',
                        click: () => mainWindow.webContents.send('change-theme', 'defaultOrange')
                    }
                ]
            },
        ]
    },
    {
        label: 'Playback',
        submenu: [
            {
                label: 'Play/Pause',
                accelerator: 'Space',
                click: () => mainWindow.webContents.send('menu-play-pause')
            },
            {
                label: 'Stop',
                accelerator: 'CmdOrCtrl+.',
                click: () => mainWindow.webContents.send('menu-stop')
            },
            { type: 'separator' },
            {
                label: 'Previous',
                accelerator: 'CmdOrCtrl+Left',
                click: () => mainWindow.webContents.send('menu-previous')
            },
            {
                label: 'Next',
                accelerator: 'CmdOrCtrl+Right',
                click: () => mainWindow.webContents.send('menu-next')
            },
            { type: 'separator' },
            {
                label: 'Rewind 10 Seconds',
                accelerator: 'Left',
                click: () => mainWindow.webContents.send('menu-seek-relative', -10)
            },
            {
                label: 'Fast Forward 10 Seconds',
                accelerator: 'Right',
                click: () => mainWindow.webContents.send('menu-seek-relative', 10)
            },
            { type: 'separator' },
            {
                label: 'Shuffle',
                accelerator: 'S',
                click: () => mainWindow.webContents.send('menu-toggle-shuffle')
            },
            {
                label: 'Repeat',
                accelerator: 'L',
                click: () => mainWindow.webContents.send('menu-toggle-repeat')
            },
            {
                label: 'Play Speed',
                submenu: [
                    {
                        label: '0.5x',
                        click: () => mainWindow.webContents.send('menu-set-playback-speed', 0.5)
                    },
                    {
                        label: '1.0x',
                        accelerator: 'CmdOrCtrl+0',
                        click: () => mainWindow.webContents.send('menu-set-playback-speed', 1)
                    },
                    {
                        label: '1.25x',
                        click: () => mainWindow.webContents.send('menu-set-playback-speed', 1.25)
                    },
                    {
                        label: '1.5x',
                        click: () => mainWindow.webContents.send('menu-set-playback-speed', 1.5)
                    },
                    {
                        label: '2.0x',
                        click: () => mainWindow.webContents.send('menu-set-playback-speed', 2)
                    }
                ]
            },
            { type: 'separator' },
            {
                label: 'Mute',
                accelerator: 'M',
                click: () => mainWindow.webContents.send('menu-toggle-mute')
            },
            {
                label: 'Volume Up',
                accelerator: 'Up',
                click: () => mainWindow.webContents.send('menu-volume-relative', 0.1)
            },
            {
                label: 'Volume Down',
                accelerator: 'Down',
                click: () => mainWindow.webContents.send('menu-volume-relative', -0.1)
            },
            { type: 'separator' },
            {
                label: 'Toggle Fullscreen',
                accelerator: 'F',
                click: () => mainWindow.webContents.send('menu-fullscreen')
            }
        ]
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'Remember Playback Position',
                type: 'checkbox',
                checked: store.get('rememberPlayback', true), // Default to true for existing users
                click: (menuItem) => {
                    store.set('rememberPlayback', menuItem.checked);
                    mainWindow.webContents.send('toggle-remember-playback', menuItem.checked);
                }
            },
            {
                label: 'Hardware Acceleration',
                type: 'checkbox',
                checked: store.get('hardwareAcceleration', true),
                click: (menuItem) => {
                    store.set('hardwareAcceleration', menuItem.checked);
                    
                    // Show dialog informing user about restart requirement
                    askRendererDialog(mainWindow, {
                        title: 'Restart Required',
                        message: 'Hardware acceleration changes will take effect after restarting the application.',
                        buttons: ['Restart Now', 'Later'],
                        defaultId: 0,
                        cancelId: 1
                    }).then(result => {
                        if (result.response === 0) {
                            // Restart the app
                            app.relaunch();
                            app.exit();
                        }
                    });
            
                    // Still send the event to update UI elements if needed
                    BrowserWindow.getAllWindows().forEach(win => {
                        win.webContents.send('toggle-hardware-acceleration', menuItem.checked);
                    });
                }
            },
            {
                label: 'Set as Default Player (Associate Media Files)',
                visible: process.platform === 'win32',
                click: async () => {
                    await setAsDefaultMediaPlayer();
                    shell.openExternal('ms-settings:defaultapps?registeredAppUser=ffinflow');
                    askRendererDialog(mainWindow, {
                        title: 'Default Media Player',
                        message: 'ffinflow is registered for all media formats!',
                        detail: 'All video (.mp4, .mkv, .avi, .webm, .mov, etc.) and audio formats have been associated with ffinflow in the Windows registry.\n\nIn the Windows Settings window that just opened, click "Set default" at the top to finalize system defaults with one click.',
                        buttons: ['OK']
                    });
                }
            },
            {
                label: 'Keyboard Shortcuts',
                click: () => {
                    askRendererDialog(mainWindow, {
                        title: 'Keyboard Shortcuts',
                        message: 'Space: Play/Pause\nF: Toggle Fullscreen\nCtrl+O: Open Files\nCtrl+Shift+O: Open Folder\nCtrl+Left: Previous\nCtrl+Right: Next',
                        buttons: ['OK']
                    });
                }
            },
            {
                label: 'Check for Updates',
                click: async () => {
                    updateCheckState.manual = true;
                    try {
                        await autoUpdater.checkForUpdatesAndNotify();
                    } catch (error) {
                        console.error('Error checking for updates:', error);
                        const result = await askRendererDialog(mainWindow, {
                            title: 'Unable to Check for Updates',
                            message: 'ffinflow could not check for updates automatically.',
                            detail: `You can check releases manually at:\n${PROJECT_URL}`,
                            buttons: ['Open GitHub', 'OK'],
                            defaultId: 0,
                            cancelId: 1
                        });

                        if (result.response === 0) {
                            shell.openExternal(PROJECT_URL);
                        }
                    } finally {
                        updateCheckState.manual = false;
                    }
                }
            },
            {
                label: 'About',
                click: async () => {
                    const result = await askRendererDialog(mainWindow, {
                        title: 'About ffinflow',
                        message: 'ffinflow',
                        detail: `Version ${app.getVersion()}\nFFmpeg-powered video and audio player\n\nCreated by Skonester\n${PROJECT_URL}`,
                        buttons: ['Visit GitHub', 'OK'],
                        defaultId: 1,
                        cancelId: 1
                    });

                    if (result.response === 0) {
                        shell.openExternal(PROJECT_URL);
                    }
                }
            },
            ...(!app.isPackaged ? [{
                label: 'Toggle Developer Tools',
                accelerator: process.platform === 'darwin' ? 'Cmd+Alt+I' : 'Ctrl+Shift+I',
                click: () => mainWindow.webContents.toggleDevTools()
            }] : [])
        ]
    }
];

module.exports = createMenuTemplate;
export {};
