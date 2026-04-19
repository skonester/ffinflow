const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const Store = require("electron-store");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const ffmpeg = require("fluent-ffmpeg");
const createMenuTemplate = require("./menu-template");

const store = new Store();

// ==============================================================================
// AGENT: MEMORY PURGE PROTOCOL
// ==============================================================================
if (process.env.DEBUG_PURGE === 'true') {
  store.delete('lastFile');
  console.log("Agent: Debug Purge active. Memory cleared.");
}

const isHardwareAccelerated = store.get("hardwareAcceleration", true);

const remoteMain = require("@electron/remote/main");
remoteMain.initialize();

if (isHardwareAccelerated) {
  app.commandLine.appendSwitch("force_high_performance_gpu");
  app.commandLine.appendSwitch("ignore-gpu-blacklist");
  app.commandLine.appendSwitch("enable-gpu-rasterization");
  app.commandLine.appendSwitch("enable-zero-copy");
  app.commandLine.appendSwitch("enable-accelerated-video-decode");
  app.commandLine.appendSwitch("enable-native-gpu-memory-buffers");
  app.commandLine.appendSwitch("enable-hardware-overlays", "single-fullscreen");
  app.commandLine.appendSwitch("enable-features", "VaapiVideoDecoder");
  app.commandLine.appendSwitch("enable-features", "PlatformHEVCDecoderSupport");
}

log.transports.file.level = "debug";
autoUpdater.logger = log;

// ==============================================================================
// AGENT: FFMPEG & FFPROBE DIRECT TARGET CONFIGURATION
// ==============================================================================
const FFMPEG_PATH = app.isPackaged 
    ? path.join(process.resourcesPath, 'ffmpeg-binaries', 'ffmpeg.exe') 
    : path.join(__dirname, 'ffmpeg-binaries', 'ffmpeg.exe');

const FFPROBE_PATH = FFMPEG_PATH.replace('ffmpeg.exe', 'ffprobe.exe');

ffmpeg.setFfmpegPath(FFMPEG_PATH);
ffmpeg.setFfprobePath(FFPROBE_PATH);

let mainWindow;
let fileToOpen = null;

// ==============================================================================
// AGENT: PRE-FLIGHT AUDIO INTERCEPTOR (SAME-DIRECTORY FAST MP4)
// ==============================================================================

async function interceptAndFixAudio(filePath) {
  return new Promise((resolve) => {
    log.info(`Agent probing file: ${filePath}`);
    
    if (mainWindow) {
      mainWindow.webContents.send("transcode-status", "Probing media file...");
    }
    
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        log.error("Agent Warning - Probe failed. Passing raw file:", err.message);
        if (mainWindow) mainWindow.webContents.send("transcode-complete", true);
        return resolve(`file:///${filePath.replace(/\\/g, '/')}`);
      }

      const audioStream = metadata.streams && metadata.streams.find(s => s.codec_type === 'audio');
      const safeCodecs = ['aac', 'opus', 'vorbis', 'flac', 'mp3', 'wav', 'pcm_s16le'];

      // If it's already safe, return the formatted file path instantly
      if (audioStream && safeCodecs.includes(audioStream.codec_name)) {
        log.info(`${audioStream.codec_name.toUpperCase()} Detected. Audio is safe. Bypassing transcode...`);
        if (mainWindow) mainWindow.webContents.send("transcode-complete", true);
        return resolve(`file:///${filePath.replace(/\\/g, '/')}`); 
      } 
      
      log.info(`Unsupported audio (${audioStream ? audioStream.codec_name : 'unknown'}) detected. Engaging MAX-SPEED FLAC transcode...`);

      if (mainWindow) {
        mainWindow.webContents.send("transcode-status", "Optimizing audio format for player...");
      }

      // Format the output path to be in the SAME directory as the original file
      const parsedPath = path.parse(filePath);
      const outputPath = path.join(parsedPath.dir, `${parsedPath.name}_FIXED.mp4`); // Force MP4 container
      
      let command = ffmpeg(filePath);
      
      let options = [
        '-c:v copy',             // Preserve HEVC losslessly
        '-tag:v hvc1',           // Electron HEVC visibility
        '-c:a flac',             // Fastest possible transcode
        '-compression_level 0',  // Max CPU speed
        '-threads 0',            // Multi-threading enabled
        '-ac 6',                 // Preserve 5.1 surround
        '-movflags +faststart'   // Puts MP4 MOOV atom at the front so it plays instantly
      ];

      command.outputOptions(options)
        .on('start', (cmd) => log.info('Executing fast FLAC transcode:', cmd))
        .on('progress', (progress) => {
           if (progress.percent) {
             const percent = Math.floor(progress.percent);
             log.debug(`Transcoding Audio: ${percent}% done`);
             if (mainWindow) {
               mainWindow.webContents.send('transcode-progress', percent);
             }
           }
        })
        .on('error', (e) => {
          log.error("Transcode failed:", e.message);
          if (mainWindow) mainWindow.webContents.send("transcode-complete", true);
          resolve(`file:///${filePath.replace(/\\/g, '/')}`);
        })
        .on('end', () => {
          log.info(`Processing complete. File saved to: ${outputPath}`);
          
          // IMPORTANT: Format the path for Chromium so it doesn't block it
          const browserSafePath = `file:///${outputPath.replace(/\\/g, '/')}`;
          
          if (mainWindow) mainWindow.webContents.send('transcode-complete', true);
          resolve(browserSafePath); // Pass the formatted URL to the frontend
        })
        .save(outputPath);
    });
  });
}

// ==============================================================================
// AGENT: OS-LEVEL INTAKE ROUTING
// ==============================================================================
async function handleFileOpen(event, filePath) {
  if (event) event.preventDefault();
  if (!filePath) return;

  filePath = filePath.replace(/^"(.*)"$/, "$1");

  // Agent Intercept: Fix the file before the UI ever sees it
  const finalizedPath = await interceptAndFixAudio(filePath);

  if (mainWindow) {
    mainWindow.webContents.send("file-opened", finalizedPath);
  } else {
    fileToOpen = finalizedPath;
  }
}

if (process.platform === "win32") {
  const gotTheLock = app.requestSingleInstanceLock();

  if (!gotTheLock) {
    app.quit();
  } else {
    app.on("second-instance", (event, commandLine) => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();

        const filePath = commandLine.find((arg) => {
          return /\.(mp4|mkv|avi|webm|mov|flv|m4v|3gp|wmv|ts|mp3|wav|ogg|aac|m4a|flac|wma|opus)$/i.test(arg);
        });

        if (filePath) {
          handleFileOpen(null, filePath);
        }
      }
    });

    const filePath = process.argv.slice(1).find((arg) => {
      return /\.(mp4|mkv|avi|webm|mov|flv|m4v|3gp|wmv|ts|mp3|wav|ogg|aac|m4a|flac|wma|opus)$/i.test(arg);
    });

    if (filePath) {
      // Async initialization for startup file
      (async () => {
        fileToOpen = await interceptAndFixAudio(filePath);
        if (mainWindow) {
          mainWindow.webContents.send("file-opened", fileToOpen);
          fileToOpen = null;
        }
      })();
    }
  }
} else {
  app.on("open-file", handleFileOpen);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      powerPreferences: "high-performance",
      webSecurity: false, // <-- Added to allow local file loading via file:///
      contentSecurityPolicy: `
          default-src 'self';
          script-src 'self' 'unsafe-inline';
          style-src 'self' 'unsafe-inline';
          media-src 'self' file: blob: data:;
          img-src 'self' data: file:;
          font-src 'self';
          connect-src 'self';
        `,
    },
    autoHideMenuBar: false,
    frame: true,
  });

  mainWindow.webContents.on("dom-ready", () => {
    mainWindow.webContents.executeJavaScript(`
      document.addEventListener('selectstart', (e) => e.preventDefault());
    `);
  });

  remoteMain.enable(mainWindow.webContents);

  const menuTemplate = createMenuTemplate(mainWindow);
  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  mainWindow.loadFile("index.html");

  mainWindow.webContents.on("did-finish-load", () => {
    const pendingUpdateVersion = store.get("pendingUpdateVersion");
    if (pendingUpdateVersion) {
      store.delete("pendingUpdateVersion");
      showPostUpdateReleaseNotes(pendingUpdateVersion);
    }

    if (fileToOpen) {
      setTimeout(() => {
        if (mainWindow) mainWindow.webContents.send("file-opened", fileToOpen);
        fileToOpen = null;
      }, 500);
    }
  });
}

app.whenReady().then(() => {
  createWindow();
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 3000);
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

autoUpdater.on("checking-for-update", () => {
  if (mainWindow) mainWindow.webContents.send("update-message", "Checking for updates...");
});

let downloadedVersion = null;

autoUpdater.on("update-available", (info) => {
  const version = info.version;
  let releaseNotes = "No release notes available";

  if (info.releaseNotes) {
    if (typeof info.releaseNotes === "string") {
      releaseNotes = info.releaseNotes;
    } else if (Array.isArray(info.releaseNotes)) {
      releaseNotes = info.releaseNotes
        .map((note) => `${note.version}\n${note.note}`)
        .join("\n\n");
    }
  }

  store.set(`releaseNotes.${version}`, releaseNotes);

  if (mainWindow) {
    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Update Available",
        message: `Version ${version} is available.`,
        detail: `Release Notes:\n${releaseNotes}\n\nWould you like to download it now?`,
        buttons: ["Yes", "No"],
        cancelId: 1,
        defaultId: 0,
      })
      .then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate();
          if (mainWindow) mainWindow.webContents.send("update-message", "Downloading update...");
        }
      });
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  if (mainWindow) mainWindow.webContents.send("update-progress", progressObj.percent);
});

function showPostUpdateReleaseNotes(version) {
  const releaseNotes = store.get(`releaseNotes.${version}`);

  if (releaseNotes && mainWindow) {
    const cleanedNotes = releaseNotes
      .replace(/<[^>]*>/g, "")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

    dialog.showMessageBox(mainWindow, {
      type: "info",
      title: "What's New",
      message: `Updates in version ${version}`,
      detail: cleanedNotes,
      buttons: ["OK"],
      defaultId: 0,
    });
  }
}

autoUpdater.on("update-downloaded", (info) => {
  downloadedVersion = info.version;
  
  if (mainWindow) {
    dialog
      .showMessageBox(mainWindow, {
        type: "info",
        title: "Update Ready",
        message:
          "Update downloaded. Would you like to install it now? The application will restart.",
        detail:
          'If you choose "No", the update will be installed the next time you restart the application.',
        buttons: ["Yes", "No"],
        cancelId: 1,
        defaultId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          if (downloadedVersion) {
            store.set("pendingUpdateVersion", downloadedVersion);
          }
          autoUpdater.quitAndInstall(false, true);
        }
      });
  }
});

autoUpdater.on("update-not-available", () => {
  if (mainWindow) mainWindow.webContents.send("update-message", "You are using the latest version.");
});

autoUpdater.on("error", (err) => {
  log.error("Update error:", err);
  log.error("Error details:", err.stack);

  if (err.message.includes("Could not get code signature")) {
    log.error("This appears to be a macOS code signature issue");
  }

  if (err.message.includes("EACCES")) {
    log.error("This appears to be a permissions issue");
  }

  if (mainWindow) mainWindow.webContents.send("update-error", err.message);
});

ipcMain.on("enforce-min-size", (_, dimensions) => {
  if (mainWindow) mainWindow.setMinimumSize(dimensions.width, dimensions.height);
});

// ==============================================================================
// AGENT: FILE DIALOG INTERCEPTOR
// ==============================================================================
ipcMain.handle("open-files", async () => {
  if (!mainWindow) return [];
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Media Files",
        extensions: [
          "mp4", "mkv", "avi", "webm", "mov", "flv", "m4v", "3gp", "wmv", "ts",
          "mp3", "wav", "ogg", "aac", "m4a", "flac", "wma", "opus"
        ],
      },
    ],
  });
  
  // Agent: Intercept and fix the first selected file before passing it back
  if (result.filePaths.length > 0) {
    const fixedPath = await interceptAndFixAudio(result.filePaths[0]);
    // Map any additional files into safe file:/// format just to be consistent
    const additionalPaths = result.filePaths.slice(1).map(p => `file:///${p.replace(/\\/g, '/')}`);
    return [fixedPath, ...additionalPaths];
  }
  
  return result.filePaths;
});

ipcMain.handle("open-folder", async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  return dialog.showOpenDialog(mainWindow, {
    properties: ["openDirectory"],
  });
});

ipcMain.handle("open-subtitle-file", async () => {
  if (!mainWindow) return { canceled: true, filePaths: [] };
  return dialog.showOpenDialog(mainWindow, {
    properties: ["openFile", "multiSelections"],
    filters: [
      {
        name: "Subtitle Files",
        extensions: ["srt", "vtt", "ass", "ssa", "sub"],
      },
    ],
  });
});

ipcMain.handle("check-for-updates", () => {
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on("toggle-menu-bar", (_, show) => {
  if (mainWindow) {
    mainWindow.setMenuBarVisibility(show);
    mainWindow.setAutoHideMenuBar(!show);
  }
});