# ffinflow Architecture

## Overview

**ffinflow** is a desktop media player for Windows built with **Electron**. It features a traditional menu-driven interface with a fixed control bar and includes a built-in FFmpeg engine that transcodes media files that Chromium cannot play natively (HEVC, E-AC3, DTS, etc.).

The project consists of two main processes:
- **Main Process** (`src/main.ts`): Electron's Node.js runtime handling IPC, system-level operations, and background services
- **Renderer Process** (`src/renderer.ts`): The UI layer running in Chromium

---

## Core Components

### Main Process (`src/main.ts`)

The entry point orchestrating the entire application lifecycle.

#### Responsibilities:
- Initialize Electron app, hardware acceleration settings
- Configure bundled binaries (FFmpeg, FFprobe, yt-dlp)
- Manage main window creation and lifecycle
- Handle IPC communication with renderer
- Implement media preparation/transcoding service
- Run the downloader engine
- Manage update checking via `electron-updater`

#### Key Functions:
| Function | Purpose |
|----------|---------|
| `createWindow()` | Creates the BrowserWindow with security policies and menus |
| `interceptAndFixAudio()` | Prepares incompatible media files for playback |
| `handleFileOpen()` | Routes opened files to renderer |
| `initDownloader()` | Sets up the YouTube media downloader |
| IPC handlers | `open-files`, `probe-media-info`, `prepare-media-for-playback`, `convert-media` |

#### Media Preparation Flow:
```
User opens file → IPC: prepare-media-for-playback
→ interceptAndFixAudio() called
→ MediaPreparationService.probe() runs ffprobe
→ createPreparationPlan() determines: direct/remux/audio/convert
→ FFmpeg executes transformation to MP4 (if needed)
→ Renderer receives cached URL for playback
```

---

### Media Services

#### `src/media/preparation-service.ts`

Handles probing and transcoding of media files before playback.

- Uses FFmpeg/FFprobe binaries bundled with the app
- Caches prepared files in temp directory with SHA256-based versioning
- Supports abort/cancel during preparation
- Emits progress events to renderer (`transcode-status`, `transcode-progress`)

#### `src/media/preparation-plan.ts`

Determines how each media file should be processed:

| Plan Kind | Condition | Action |
|-----------|-----------|--------|
| `direct` | All streams match native codecs | Play immediately |
| `remux` | Container unsupported but streams valid | Remux to MP4 without re-encoding |
| `audio` | Audio codec incompatible | Re-encode audio to FLAC/AAC |
| `convert` | Video codec incompatible | Full re-encode to H.264 |

---

### Downloader Engine (`src/downloader/engine.ts`)

Built on top of **yt-dlp**, manages downloading and organizing media from URLs.

#### State Management:
- `running`: Map of active download child processes
- `stopped`: Paused/cancelled jobs awaiting resume
- `scheduling`: Ensures only one job scheduler runs at a time

#### Workflow:
1. User selects URL(s) → `analyze()` calls yt-dlp `--dump-single-json`
2. Selected entries queued via `store.createJob()`
3. `schedule()` picks up to `maxConcurrent` jobs
4. Each job spawns yt-dlp subprocess with custom progress template
5. Output validated via ffprobe before completion notification

#### Features:
- Partial file recovery after Windows filename encoding issues
- Retry logic with exponential backoff
- Category-aware folder organization (Video/Audio subfolders)
- Post-processing verification (empty file check, stream validation)

---

### Renderer Process (`src/renderer.ts`)

The Chromium-based UI layer. Due to size (~25KB), key subsystems are modular:

#### Modules:
| File | Responsibility |
|------|---------------|
| `src/renderer.ts` | Bootstraps app, creates player, wires IPC |
| `src/subtitles.ts` | Subtitle management (load, delay, track switching) |
| `src/modules/menu.ts` | Menu bar rendering and commands |
| `src/modules/playerUI.ts` | Control bar, playlist panel, OSD overlays |
| `src/modules/settings.ts` | Preferences UI and persistence |
| `src/modules/downloaderUI.ts` | Download manager interface |

#### IPC Integration:
Renderer sends/receives messages via `ipcRenderer`/`ipcMain`:
- `file-opened` → preload renderer with new media
- `transcode-status` / `transcode-progress` → show preparation UI
- `downloader:job-changed` / `downloader:log` → update download UI
- `update-message` / `update-progress` → handle update notifications

---

## Binary Bundles

ffinflow bundles third-party binaries alongside the app:

| Directory | Binaries |
|-----------|----------|
| `ffmpeg-binaries/` | `ffmpeg.exe`, `ffprobe.exe` |
| `ytdlp-binaries/` | `yt-dlp.exe` |

Paths resolved at runtime:
```typescript
const FFMPEG_PATH = app.isPackaged
  ? path.join(process.resourcesPath, 'ffmpeg-binaries', 'ffmpeg.exe')
  : path.join(__dirname, '..', 'ffmpeg-binaries', 'ffmpeg.exe');
```

---

## Data Persistence

### `src/store.ts`

Central store using `electron-store` for JSON-based persistence.

Stores:
- Playback position, volume, playlist order
- Theme selection
- Downloader settings (output paths, format preferences)
- Update notes cache

---

## Theming

Supports 18 visual themes defined in `src/modules/themes/*.css`. Theme is selected via dropdown in settings and persisted to store.

---

## External Dependencies

| Package | Purpose |
|---------|---------|
| `electron` | Desktop framework |
| `electron-updater` | Update checking and installation |
| `electron-store` | JSON persistence |
| `electron-log` | Logging to disk |
| `fluent-ffmpeg` | FFmpeg bindings |
| `@electron/remote` | Remote module access |

---

## Build & Distribution

```bash
git clone https://github.com/skonester/ffinflow.git
cd ffinflow
npm install
npm run build   # Produces dist/<version>/ffinflow-setup.exe
```

Installer created via electron-builder configuration in `package.json`.

---

## License

GPLv3. Portions adapted from:
- **Fury** (player GUI) – MIT (Naveen Devang)
- **dlME** (downloader engine) – MIT (Kirsten Trimaley)
- **yt-dlp** – Unlicense
