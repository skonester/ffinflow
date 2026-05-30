const { app, dialog, shell } = require('electron');
const { getCurrentTheme } = require('./modules/themes');
const { RELEASE_NOTES } = require('./release-notes');
const { autoUpdater } = require('electron-updater');
const Store = require('electron-store');
const store = new Store();
const { BrowserWindow } = require('electron');

const PROJECT_URL = 'https://github.com/skonester/ffinflow';

const createMenuTemplate = (mainWindow) => [
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
                        label: 'Default',
                        type: 'radio',
                        checked: getCurrentTheme() === 'default',
                        click: () => mainWindow.webContents.send('change-theme', 'default')
                    },
                    {
                        label: 'Cosmos',
                        type: 'radio',
                        checked: getCurrentTheme() === 'cosmos',
                        click: () => mainWindow.webContents.send('change-theme', 'cosmos')
                    },
                    {
                        label: 'Blood Moon',
                        type: 'radio',
                        checked: getCurrentTheme() === 'bloodMoon',
                        click: () => mainWindow.webContents.send('change-theme', 'bloodMoon')
                    },
                    {
                        label: 'Crystal Wave',
                        type: 'radio',
                        checked: getCurrentTheme() === 'crystalWave',
                        click: () => mainWindow.webContents.send('change-theme', 'crystalWave')
                    },
                    {
                        label: 'Solar Flare',
                        type: 'radio',
                        checked: getCurrentTheme() === 'solarFlare',
                        click: () => mainWindow.webContents.send('change-theme', 'solarFlare')
                    },
                    {
                        label: 'Aurora Breeze',
                        type: 'radio',
                        checked: getCurrentTheme() === 'auroraBreeze',
                        click: () => mainWindow.webContents.send('change-theme', 'auroraBreeze')
                    },
                    {
                        label: 'Neon Dreams',
                        type: 'radio',
                        checked: getCurrentTheme() === 'neonDreams',
                        click: () => mainWindow.webContents.send('change-theme', 'neonDreams')
                    },
                    {
                        label: 'Emerald Forest',
                        type: 'radio',
                        checked: getCurrentTheme() === 'emeraldForest',
                        click: () => mainWindow.webContents.send('change-theme', 'emeraldForest')
                    },
                    {
                        label: 'Crimson Night',
                        type: 'radio',
                        checked: getCurrentTheme() === 'crimsonNight',
                        click: () => mainWindow.webContents.send('change-theme', 'crimsonNight')
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
                    dialog.showMessageBox({
                        type: 'info',
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
                label: 'Release Notes',
                click: async () => {
                    const currentVersion = app.getVersion();
                    let message = `Current Version: ${currentVersion}\n\nCurrent Release Notes:\n`;
                    
                    // Add current version's release notes
                    if (RELEASE_NOTES && RELEASE_NOTES[currentVersion]) {
                        message += '• ' + RELEASE_NOTES[currentVersion].join('\n• ') + '\n\n';
                    } else {
                        message += 'No release notes available for current version.\n\n';
                    }
                    
                    try {
                        const updateCheckResult = await autoUpdater.checkForUpdates();
                        if (updateCheckResult && updateCheckResult.updateInfo) {
                            const newVersion = updateCheckResult.updateInfo.version;
                            if (newVersion !== currentVersion) {
                                message += `New Version Available: ${newVersion}\n\nNew Release Notes:\n`;
                                if (RELEASE_NOTES && RELEASE_NOTES[newVersion]) {
                                    message += '• ' + RELEASE_NOTES[newVersion].join('\n• ') + '\n\n';
                                } else if (updateCheckResult.updateInfo.releaseNotes) {
                                    message += updateCheckResult.updateInfo.releaseNotes + '\n\n';
                                } else {
                                    message += 'No release notes available for new version.\n\n';
                                }
                                
                                dialog.showMessageBox(mainWindow, {
                                    title: 'Release Notes',
                                    message: message,
                                    buttons: ['Update Now', 'Later'],
                                    defaultId: 1,
                                    cancelId: 1,
                                    detail: 'Would you like to update to the new version?'
                                }).then(result => {
                                    if (result.response === 0) {
                                        autoUpdater.downloadUpdate();
                                        mainWindow.webContents.send('update-message', 'Downloading update...');
                                    }
                                });
                            } else {
                                dialog.showMessageBox(mainWindow, {
                                    title: 'Release Notes',
                                    message: message,
                                    buttons: ['OK']
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Error checking for updates:', error);
                        dialog.showMessageBox(mainWindow, {
                            title: 'Release Notes',
                            message: message,
                            buttons: ['OK']
                        });
                    }
                }
            },
            {
                label: 'Keyboard Shortcuts',
                click: () => {
                    dialog.showMessageBox(mainWindow, {
                        title: 'Keyboard Shortcuts',
                        message: 'Space: Play/Pause\nF: Toggle Fullscreen\nCtrl+O: Open Files\nCtrl+Shift+O: Open Folder\nCtrl+Left: Previous\nCtrl+Right: Next',
                        buttons: ['OK']
                    });
                }
            },
            {
                label: 'Check for Updates',
                click: async () => {
                    try {
                        await autoUpdater.checkForUpdatesAndNotify();
                    } catch (error) {
                        console.error('Error checking for updates:', error);
                        const result = await dialog.showMessageBox(mainWindow, {
                            type: 'warning',
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
                    }
                }
            },
            {
                label: 'About',
                click: () => {
                    dialog.showMessageBox(mainWindow, {
                        title: 'About ffinflow',
                        message: 'ffinflow Media Player\nVersion ' + app.getVersion(),
                        buttons: ['OK']
                    });
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
