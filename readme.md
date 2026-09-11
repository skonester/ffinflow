<div align="center">
  <img src="images/main.png" alt="ffinflow main interface" width="220" />
  <br/>
  <img src="images/player.png" alt="ffinflow player interface" width="560" />

  <br/><br/>

  <a href="https://github.com/skonester/ffinflow/releases/latest"><img src="https://img.shields.io/github/v/release/skonester/ffinflow?label=Latest%20Release&style=flat-square" alt="Latest Release" /></a>
  <a href="https://github.com/skonester/ffinflow/releases/latest"><img src="https://img.shields.io/github/downloads/skonester/ffinflow/total?label=Downloads&style=flat-square" alt="Total Downloads" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-GPL--3.0-red?style=flat-square" alt="GPLv3 License" /></a>
  <a href="https://github.com/skonester/ffinflow/releases/latest"><img src="https://img.shields.io/badge/Platform-Windows-blue?style=flat-square" alt="Platform" /></a>

  <br/><br/>

  <img src="GPL3.png" alt="GPLv3" />
  <a href="https://github.com/skonester/ffinflow/releases/latest">
    <img src="https://img.shields.io/badge/Download-ffinflow%20for%20Windows-0078d4?style=for-the-badge&logo=windows&logoColor=white" alt="Download ffinflow for Windows" />
  </a>

</div>

# ffinflow

A no-nonsense desktop media player for Windows with a classic, always-visible control layout and a built-in FFmpeg engine that transcodes whatever Chromium can't play natively — HEVC, E-AC3, DTS, oddball MKVs, and more.

> Independent open-source project. Not affiliated with Microsoft or Windows Media Player — just inspired by that simple, no-gestures-required layout.

---

### 🚀 Features

- Traditional menu-driven interface with a fixed control bar — no hidden gestures
- Plays virtually anything: files Chromium can't decode natively are transcoded automatically
- Drag-and-drop playlist with shuffle, repeat, and reordering
- External and embedded subtitle support
- Media info overlay (codec, resolution, bitrate, audio/subtitle tracks)
- 18 built-in visual themes
- Remembers playback position, volume, and playlist between sessions
- Optional file association for common video/audio formats during install
- Built-in media downloader (File → Download Media...): analyze a URL, download video or audio with live progress, get a verified MP4 on completion, and browse everything in a local file library

### 🎞 Supported Formats

| Type | Extensions |
| :--- | :--- |
| Video | `.mp4` `.mkv` `.avi` `.webm` `.mov` `.flv` `.m4v` `.3gp` `.wmv` `.ts` |
| Audio | `.mp3` `.wav` `.ogg` `.aac` `.m4a` `.flac` `.wma` `.opus` |
| Subtitles | `.srt` `.vtt` `.ass` `.ssa` `.sub` |

Anything outside native browser support (HEVC, E-AC3, DTS, TrueHD, older codecs, and more) is transcoded automatically by the bundled FFmpeg engine before playback starts.

### ⌨️ Keyboard Shortcuts

| Key | Action | Key | Action |
| :--- | :--- | :--- | :--- |
| Space | Play / Pause | M | Mute / unmute |
| F | Toggle fullscreen | S | Toggle shuffle |
| Escape | Exit fullscreen | L | Toggle repeat |
| ←  / → | Seek ±10s | I | Toggle media info |
| Ctrl+← / Ctrl+→ | Previous / Next track | T | Toggle playlist |
| ↑ / ↓ | Volume up / down | 0-9 | Seek to 0%-90% |

### 📥 Installation

Grab the latest installer from [Releases](https://github.com/skonester/ffinflow/releases/latest). Windows only.

### 🔧 Build from source

```bash
git clone https://github.com/skonester/ffinflow.git
cd ffinflow
npm install
npm run build
```

The installer is written to `dist/`.

### 📄 License

GNU General Public License v3.0 (or later). See [LICENSE](LICENSE).

Portions of the codebase remain available under their original MIT License —
see [LICENSE-MIT](LICENSE-MIT) — including the original player GUI, adapted
from [Fury](https://github.com/naveen-devang/Fury) (© Naveen Devang) prior to
ffinflow's transition to TypeScript, and the downloader engine
(`src/downloader/`, `src/modules/downloaderUI.ts`), adapted from
[dlME](https://github.com/YazeKT/dlME) (© Kirsten Trimaley). The built-in
downloader also bundles [yt-dlp](https://github.com/yt-dlp/yt-dlp) (Unlicense).
