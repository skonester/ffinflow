const { app, BrowserWindow, ipcMain, dialog, Menu } = require("electron");
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const crypto = require("crypto");
const { fileURLToPath } = require("url");
const Store = require("electron-store");
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");
const ffmpeg = require("fluent-ffmpeg");
const { mediaInfoFactory } = require("mediainfo.js");
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
let execaLoader = null;

async function getExeca() {
  if (!execaLoader) {
    execaLoader = import("execa").then((module) => module.execa);
  }
  return execaLoader;
}

function toFfprobePath(filePath) {
  if (!filePath) return filePath;
  if (filePath.startsWith("file://")) {
    try {
      return fileURLToPath(filePath);
    } catch (_) {
      return filePath.replace(/^file:\/\/\//, "").replace(/\//g, "\\");
    }
  }
  return filePath;
}

function normalizeMediaPath(filePath) {
  if (!filePath) return filePath;
  const unquotedPath = filePath.replace(/^"(.*)"$/, "$1");
  return toFfprobePath(unquotedPath);
}

function cleanDisposition(disposition) {
  if (!disposition) return {};
  return Object.fromEntries(
    Object.entries(disposition).filter(([, value]) => Boolean(value)),
  );
}

function mapStreamForDisplay(stream) {
  return {
    index: stream.index,
    type: stream.codec_type,
    codec: stream.codec_name || "unknown",
    codecLongName: stream.codec_long_name || "",
    profile: stream.profile || "",
    width: stream.width,
    height: stream.height,
    pixFmt: stream.pix_fmt,
    sampleRate: stream.sample_rate,
    channels: stream.channels,
    channelLayout: stream.channel_layout,
    language: stream.tags?.language,
    title: stream.tags?.title,
    bitRate: stream.bit_rate,
    frameRate: stream.avg_frame_rate || stream.r_frame_rate,
    disposition: cleanDisposition(stream.disposition),
  };
}

function formatProbeInfo(filePath, metadata) {
  const streams = metadata.streams || [];
  return {
    filePath,
    format: {
      name: metadata.format?.format_name || "",
      longName: metadata.format?.format_long_name || "",
      duration: metadata.format?.duration,
      bitRate: metadata.format?.bit_rate,
      size: metadata.format?.size,
    },
    video: streams.filter((stream) => stream.codec_type === "video").map(mapStreamForDisplay),
    audio: streams.filter((stream) => stream.codec_type === "audio").map(mapStreamForDisplay),
    subtitles: streams.filter((stream) => stream.codec_type === "subtitle").map(mapStreamForDisplay),
  };
}

// ==============================================================================
// AGENT: MEDIA COMPATIBILITY PRE-FLIGHT
// ==============================================================================

const BROWSER_NATIVE_EXTENSIONS = new Set([
  ".mp4", ".m4v", ".webm", ".mp3", ".wav", ".ogg", ".aac", ".m4a", ".flac", ".opus",
]);

function getCompatibilityOutputPath(filePath, suffix = "prepared") {
  const parsedPath = path.parse(filePath);
  const hash = crypto
    .createHash("sha1")
    .update(filePath)
    .update(String(Date.now()))
    .digest("hex")
    .slice(0, 10);
  const fileName = `${parsedPath.name}_${suffix}_${hash}.mp4`;
  return path.join(app.getPath("temp"), "ffinflow-media-cache", fileName);
}

async function analyzeWithMediaInfo(filePath) {
  let fileHandle;
  let mediaInfo;

  try {
    fileHandle = await fs.open(filePath, "r");
    const stats = await fileHandle.stat();
    mediaInfo = await mediaInfoFactory({ format: "object" });

    const readChunk = async (size, offset) => {
      const buffer = Buffer.alloc(size);
      const { bytesRead } = await fileHandle.read(buffer, 0, size, offset);
      return bytesRead === size ? buffer : buffer.subarray(0, bytesRead);
    };

    const result = await mediaInfo.analyzeData(() => stats.size, readChunk);
    const tracks = result?.media?.track || [];
    const general = tracks.find((track) => track["@type"] === "General") || {};
    const video = tracks.find((track) => track["@type"] === "Video") || null;
    const audio = tracks.find((track) => track["@type"] === "Audio") || null;

    return {
      generalFormat: general.Format || "",
      videoFormat: video?.Format || "",
      videoCodecId: video?.CodecID || "",
      audioFormat: audio?.Format || "",
      audioCodecId: audio?.CodecID || "",
    };
  } finally {
    if (mediaInfo) mediaInfo.close();
    if (fileHandle) await fileHandle.close();
  }
}

function canFastRemuxToMp4(mediaInfo) {
  const videoFormat = `${mediaInfo.videoFormat} ${mediaInfo.videoCodecId}`.toLowerCase();
  const audioFormat = `${mediaInfo.audioFormat} ${mediaInfo.audioCodecId}`.toLowerCase();
  const videoOk = !mediaInfo.videoFormat || /avc|h\.?264/.test(videoFormat);
  const audioOk = !mediaInfo.audioFormat || /aac|mp3|mpeg audio/.test(audioFormat);
  return videoOk && audioOk;
}

async function runFfmpeg(args, statusMessage) {
  const execa = await getExeca();
  if (mainWindow) {
    mainWindow.webContents.send("transcode-status", statusMessage);
  }

  log.info(`Running FFmpeg: ${FFMPEG_PATH} ${args.join(" ")}`);
  await execa(FFMPEG_PATH, args, { all: true });

  if (mainWindow) {
    mainWindow.webContents.send("transcode-progress", 100);
  }
}

async function prepareForBrowserPlayback(filePath) {
  filePath = normalizeMediaPath(filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (BROWSER_NATIVE_EXTENSIONS.has(extension)) {
    return filePath;
  }

  if (mainWindow) {
    mainWindow.webContents.send("transcode-status", "Inspecting media compatibility...");
  }

  let mediaInfo = null;
  try {
    mediaInfo = await analyzeWithMediaInfo(filePath);
    log.info("MediaInfo compatibility summary:", mediaInfo);
  } catch (error) {
    log.warn("MediaInfo analysis failed. Falling back to FFprobe/FFmpeg path:", error.message);
  }

  const shouldTryRemux = extension === ".flv" && mediaInfo && canFastRemuxToMp4(mediaInfo);
  const outputPath = getCompatibilityOutputPath(filePath, shouldTryRemux ? "remuxed" : "converted");
  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  const baseArgs = ["-y", "-hide_banner", "-i", filePath];

  try {
    if (shouldTryRemux) {
      await runFfmpeg(
        [
          ...baseArgs,
          "-map", "0:v:0?",
          "-map", "0:a:0?",
          "-c", "copy",
          "-movflags", "+faststart",
          outputPath,
        ],
        "Remuxing media for browser playback...",
      );
    } else {
      await runFfmpeg(
        [
          ...baseArgs,
          "-map", "0:v:0?",
          "-map", "0:a:0?",
          "-c:v", "libx264",
          "-preset", "veryfast",
          "-crf", "23",
          "-pix_fmt", "yuv420p",
          "-c:a", "aac",
          "-b:a", "192k",
          "-movflags", "+faststart",
          outputPath,
        ],
        "Converting media for browser playback...",
      );
    }

    return outputPath;
  } catch (error) {
    log.error("FFmpeg compatibility preparation failed:", error.message);
    return filePath;
  } finally {
    if (mainWindow) mainWindow.webContents.send("transcode-complete", true);
  }
}

async function interceptAndFixAudio(filePath) {
  return prepareForBrowserPlayback(filePath);
}

// ==============================================================================
// AGENT: OS-LEVEL INTAKE ROUTING
// ==============================================================================
async function handleFileOpen(event, filePath) {
  if (event) event.preventDefault();
  if (!filePath) return;

  filePath = normalizeMediaPath(filePath);

  if (mainWindow) {
    mainWindow.webContents.send("file-opened", filePath);
  } else {
    fileToOpen = filePath;
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
      fileToOpen = normalizeMediaPath(filePath);
      if (mainWindow) {
        mainWindow.webContents.send("file-opened", fileToOpen);
        fileToOpen = null;
      }
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
      devTools: !app.isPackaged,
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

  if (app.isPackaged) {
    mainWindow.webContents.on("devtools-opened", () => {
      mainWindow.webContents.closeDevTools();
    });
  }

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
  
  if (result.filePaths.length > 0) {
    return result.filePaths.map(normalizeMediaPath);
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

ipcMain.handle("prepare-media-for-playback", async (_, filePath) => {
  return prepareForBrowserPlayback(filePath);
});

ipcMain.handle("probe-media-info", async (_, filePath) => {
  const probePath = toFfprobePath(filePath);
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(probePath, (err, metadata) => {
      if (err) {
        reject(new Error(`Unable to probe media info: ${err.message}`));
        return;
      }
      resolve(formatProbeInfo(probePath, metadata));
    });
  });
});

ipcMain.on("toggle-menu-bar", (_, show) => {
  if (mainWindow) {
    mainWindow.setMenuBarVisibility(show);
    mainWindow.setAutoHideMenuBar(!show);
  }
});
