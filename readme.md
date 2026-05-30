<div align="center">
  <img src="images/main.png" alt="ffinflow main interface" width="220" />
  <br/>
  <img src="images/player.png" alt="ffinflow player interface" width="560" />
</div>

# ffinflow

ffinflow is a desktop media player for Windows built on Electron with an integrated FFmpeg transcoding engine. It plays local video and audio files using a traditional, menu-driven interface with static playback controls that remain visible at all times.

The application is written in TypeScript, compiled to JavaScript, and packaged as a native Windows installer.

> ffinflow is an independent project and is not affiliated with Microsoft or Windows Media Player.

---

## Why This Exists

Most modern media players fall into one of two categories: minimal single-purpose players that break on anything beyond MP4/H.264, or heavyweight applications loaded with library management, streaming integration, and interface layers that obscure basic playback controls.

ffinflow occupies the middle ground. It is a local-file media player with a traditional desktop layout -- top menu bar, static buttons, a playlist sidebar, and a video surface -- combined with a real transcoding backend that can handle files the browser engine alone cannot play.

The original Windows Media Player had a straightforward workflow: open a file, see the video, use obvious controls, manage a playlist. That model still works. But modern local media has grown more complex. MKV containers, HEVC/H.265 video, E-AC3 and DTS surround audio, embedded subtitle tracks in multiple languages, and uncommon container formats like FLV all require tooling that older players were never designed to provide.

ffinflow was built to solve that gap without introducing unnecessary complexity.

---

## Transcoding Engine

The core differentiator of ffinflow is its pre-flight media processing pipeline. Before any file reaches the player surface, ffinflow probes it with FFprobe to inspect every stream. Based on what it finds, the engine takes one of three paths:

### Direct Playback (No Processing)

If the file uses a browser-native container (MP4, WebM, M4V) and all streams use codecs that Chromium can decode natively (H.264, H.265/HEVC, VP8, VP9, AV1 for video; AAC, Opus, Vorbis, FLAC, MP3 for audio), the file is passed directly to the player with zero processing overhead.

### Audio Transcoding (Lossless Video Copy)

If the file contains video that Chromium can decode but the audio stream uses an unsupported codec -- such as E-AC3 (Dolby Digital Plus), AC-3, DTS, or TrueHD -- ffinflow transcodes only the audio stream to FLAC while copying the video stream bit-for-bit. This preserves the original video quality with no re-encoding.

The transcoded output is saved alongside the original file as `<filename>_FIXED.mp4` and reused on subsequent plays. The process uses maximum CPU threading, zero-compression FLAC encoding for speed, 5.1 surround sound channel mapping, HEVC tagging for Electron visibility, and the `faststart` flag so playback can begin immediately.

### Container Remuxing and Full Conversion

If the file uses a container that Chromium cannot open at all -- such as FLV, AVI, WMV, or 3GP -- ffinflow inspects the internal streams:

- If the video and audio codecs are already browser-compatible (for example, an FLV containing H.264 video with AAC audio), ffinflow performs a fast stream copy (remux) into a temporary MP4 file. This takes seconds, not minutes, because no re-encoding occurs.
- If the streams themselves are incompatible, ffinflow performs a full conversion to H.264/AAC MP4 using the `veryfast` x264 preset.

Temporary files are written to the system temp directory under `ffinflow-media-cache`. All FFmpeg operations use atomic writes: output goes to a `.tmp` file first, then is renamed to the final path on success. If the process is interrupted, no corrupt partial files are left behind.

---

## Player Interface

The interface uses a fixed layout with no hidden controls or gesture-dependent interactions.

### Static Control Bar

The bottom control bar contains the following buttons, always visible:

- Previous track
- Play / Pause
- Next track
- Volume slider and mute toggle
- Shuffle toggle
- Repeat toggle (playlist repeat and single-track loop)
- Playback speed selector (0.5x, 1.0x, 1.25x, 1.5x, 2.0x)
- Fullscreen toggle
- Playlist panel toggle

A time slider with hover-preview timestamps and smooth seeking sits above the control buttons. Elapsed and total duration are displayed as a running counter.

### Playlist Sidebar

The right-side playlist panel shows all loaded files with drag-and-drop reordering. The currently playing track is highlighted. A clear button at the top empties the playlist. The panel can be toggled on and off with the sidebar button or by pressing T.

### Video Surface

The center of the window is a video surface that responds to single-click for play/pause and double-click for fullscreen. Mouse inactivity hides the cursor and control bar during fullscreen playback.

### Media Info Overlay

Pressing I or selecting Toggle Media Info from the View menu displays a heads-up overlay on the video surface showing container format, duration, bitrate, video codec details (resolution, frame rate, pixel format, profile), audio stream details (codec, channels, sample rate, bitrate), and subtitle stream listings. The overlay refreshes every second with the current playback state.

---

## Desktop Menus

All player functions are accessible through the native desktop menu bar.

### File

| Action | Shortcut |
| :--- | :--- |
| Open Files | Ctrl+O |
| Open Folder | Ctrl+Shift+O |
| Clear Playlist | Ctrl+Shift+C |
| Exit | Alt+F4 |

### View

| Action | Shortcut |
| :--- | :--- |
| Toggle Media Info | I |
| Change Theme | (submenu) |

### Playback

| Action | Shortcut |
| :--- | :--- |
| Play / Pause | Space |
| Stop | Ctrl+. |
| Previous | Ctrl+Left |
| Next | Ctrl+Right |
| Rewind 10 Seconds | Left |
| Fast Forward 10 Seconds | Right |
| Shuffle | S |
| Repeat | L |
| Play Speed | (submenu) |
| Mute | M |
| Volume Up | Up |
| Volume Down | Down |
| Toggle Fullscreen | F |

### Help

- Remember Playback Position (checkbox)
- Hardware Acceleration (checkbox, requires restart)
- Release Notes
- Keyboard Shortcuts
- Check for Updates
- About

---

## Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| Space | Play / Pause |
| F | Toggle fullscreen |
| Escape | Exit fullscreen |
| Left | Rewind 10 seconds |
| Right | Fast forward 10 seconds |
| Ctrl+Left | Previous track |
| Ctrl+Right | Next track |
| Up | Volume up |
| Down | Volume down |
| M | Mute / unmute |
| S | Toggle shuffle |
| L | Toggle repeat |
| I | Toggle media info overlay |
| T | Toggle playlist panel |
| [ | Subtitle delay -0.1s |
| ] | Subtitle delay +0.1s |
| \ | Reset subtitle delay |
| 0-9 | Seek to 0%-90% of duration |

---

## Subtitle Support

ffinflow handles both external and embedded subtitle files.

- External subtitle files (.srt, .vtt, .ass, .ssa, .sub) are auto-detected in the same directory as the media file and loaded automatically.
- External subtitle files can also be loaded manually through the file dialog.
- Embedded subtitle streams inside MKV and other containers are detected via FFprobe and extracted to temporary VTT files for rendering.
- Subtitle timing can be adjusted in real time using the bracket keys, and reset with the backslash key.

---

## Themes

Nine visual themes are available from the View menu:

- Default
- Cosmos
- Blood Moon
- Crystal Wave
- Solar Flare
- Aurora Breeze
- Neon Dreams
- Emerald Forest
- Crimson Night

The selected theme is saved and restored between sessions.

---

## Supported Formats

### Video

`.mp4`, `.mkv`, `.avi`, `.webm`, `.mov`, `.flv`, `.m4v`, `.3gp`, `.wmv`, `.ts`

### Audio

`.mp3`, `.wav`, `.ogg`, `.aac`, `.m4a`, `.flac`, `.wma`, `.opus`

### Subtitles

`.srt`, `.vtt`, `.ass`, `.ssa`, `.sub`

Files that Chromium cannot decode directly may still play after ffinflow processes them through the transcoding engine. The specific path taken (direct playback, audio transcode, remux, or full conversion) depends on the container and codec combination detected during probing.

---

## Installer and File Associations

The Windows installer is built with Electron Builder using NSIS. It uses a multi-step wizard that includes:

- A destination directory selector.
- A file associations page where the user can choose to make ffinflow the default player for common media formats (.mp4, .mkv, .avi, .webm, .mov, .flv, .3gp, .wmv, .ts, .m4v). This checkbox is enabled by default.

File associations are registered in the current user's registry scope (HKEY_CURRENT_USER), so no administrator privileges are required. The application is also registered in the Windows "Open With" list for all supported video extensions. Associations are cleaned up safely during uninstallation.

When a file is opened via a file association, the file path is passed to ffinflow through process arguments and routed directly to the transcoding engine and player.

---

## Saved State

ffinflow remembers the following between sessions:

- Playlist contents and order
- Playback position for each file (configurable, enabled by default)
- Volume level
- Selected theme
- Hardware acceleration preference

All state is stored locally using electron-store. No account, network connection, or cloud service is required.

---

## Auto-Updates

ffinflow supports automatic update checking through electron-updater. On startup, the application checks for new releases published to GitHub. When an update is available, the user is prompted to download and install it. Release notes are displayed before and after updates.

Updates can also be triggered manually from the Help menu.

---

## Project Structure

| Directory / File | Purpose |
| :--- | :--- |
| `src/main.ts` | Electron main process. Application lifecycle, FFmpeg/FFprobe path configuration, file-open routing, media probing, transcoding engine, and IPC handlers. |
| `src/renderer.ts` | Player UI orchestration. Playlist state, playback controls, media info overlay, keyboard shortcuts, drag-and-drop, menu event wiring, and settings management. |
| `src/subtitles.ts` | Subtitle discovery, embedded subtitle extraction via FFmpeg, subtitle rendering, timing adjustment, and cache management. |
| `src/menu-template.ts` | Native desktop menu definitions for File, View, Playback, and Help menus. |
| `src/release-notes.ts` | Version-keyed release notes for the update dialog. |
| `src/modules/` | Smaller modules for constants, file system operations, fullscreen management, hardware acceleration, media controls, playback position, player UI adjustments, themes, and utilities. |
| `src/types/` | TypeScript type declarations for global variables shared across modules. |
| `out/` | Compiled JavaScript output (generated by tsc). |
| `build/` | Build resources including the application icon and the custom NSIS installer script. |
| `ffmpeg-binaries/` | Prebuilt FFmpeg and FFprobe executables, packaged into the installer as extra resources. |
| `index.html` | Application shell with the player layout, control bar, and playlist panel. |
| `styles.css` | All visual styling and theme definitions. |

---

## Development

Install dependencies:

```bash
npm install
```

Compile TypeScript to JavaScript:

```bash
npm run compile
```

Start the application in development mode:

```bash
npm start
```

Build the Windows installer:

```bash
npm run build
```

Publish a release through Electron Builder:

```bash
npm run publish
```

---

## FFmpeg Binaries

The project uses prebuilt FFmpeg and FFprobe binaries. After `npm install`, the postinstall script copies them into `ffmpeg-binaries/`:

```bash
node copyFFmpeg.js
```

Electron Builder packages that directory through the `extraResources` configuration, so the installed application loads the binaries from `resources/ffmpeg-binaries/`.

Custom FFmpeg builds can be used by replacing `ffmpeg-binaries/ffmpeg.exe` and `ffmpeg-binaries/ffprobe.exe` before running `npm run build`.

The binaries are tracked with Git LFS due to GitHub's file size limits. The LFS rule is defined in `.gitattributes`:

```
ffmpeg-binaries/*.exe filter=lfs diff=lfs merge=lfs -text
```

---

## Platform

ffinflow is currently Windows-only. The packaged build expects Windows executables (`ffmpeg.exe`, `ffprobe.exe`), the Electron Builder configuration targets NSIS, and file association registration uses the Windows registry. Cross-platform packaging is not currently planned.

---

## License

MIT License. See [LICENSE](LICENSE).
