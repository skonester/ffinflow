<div align="center">
  <img src="images/main.png" alt="ffinflow main interface" width="400" />
  <br/>
  <img src="images/player.png" alt="ffinflow player interface" width="200" />
</div>

# ffinflow

> A minimalist media player built on the Electron framework, leveraging a decoupled architecture where Chromium handles the UI rendering and FFmpeg provides the underlying codec support and stream processing.

---

## Technical Architecture

The application operates using a standard Electron multi-process model:

* **Main Process (Node.js):** Manages the application lifecycle, native OS window configurations, and filesystem access. It serves as the host for the `ffmpeg-static` binaries and handles metadata extraction via `music-metadata`.
* **Renderer Process (Chromium):** A hardware-accelerated frontend environment that executes the `playerui.js` logic and renders the video canvas.
* **IPC Bridge:** Facilitates high-speed asynchronous communication between the UI and the Node.js backend to handle file buffers, playlist states, and hardware acceleration switches.

---

## Key Technical Features

### Engine & Codec Support
* **FFmpeg Integration:** Utilizes `ffmpeg-static` and `fluent-ffmpeg` to provide broad container compatibility, including `.mkv`, `.avi`, `.flv`, `.mov`, and `.wmv`.
* **Hardware Acceleration:** Configured via Chromium switches (`force_high_performance_gpu`, `enable-accelerated-video-decode`) to offload decoding tasks from the CPU to the GPU.
* **Atomic Metadata Extraction:** Non-blocking parsing of ID3, Vorbis, and MP4 tags, including embedded base64 cover art, via `music-metadata`.

### Subtitle Management System
* **Format Compatibility:** Supports internal stream extraction and external sidecar files (`.srt`, `.vtt`).
* **Heuristic Detection:** Implements a directory-scanning algorithm to automatically associate external subtitle assets based on filename string matching.
* **State Persistence:** Utilizes `electron-store` to maintain a local JSON database of user preferences per unique file hash (UID).

### Playback Logic & UI
* **Event-Driven Controls:** Volume attenuation via wheel-event listeners and global hotkey mapping for playback state management.
* **Dynamic Queue Management:** Implements a drag-and-drop API for real-time playlist mutation, allowing for array-based shuffling and recursive looping.
* **Session Resumption:** Caches the `currentTime` property of the media element to local storage, allowing for millisecond-precise playback resumption.

---

## Core Dependencies

| Dependency | Purpose | Description |
| :--- | :--- | :--- |
| **`electron`** | Application shell & window management | Integrates the Chromium rendering engine with the Node.js runtime to manage the app lifecycle and native OS controls. |
| **`ffmpeg-static`** | Static binaries for media processing | Provides pre-compiled, standalone FFmpeg binaries, ensuring cross-platform decoding without a global host installation. |
| **`fluent-ffmpeg`** | Fluent API for FFmpeg interaction | A high-level abstraction layer translating JS commands into complex FFmpeg arguments for programmatic stream control. |
| **`music-metadata`** | Metadata & cover art parser | Non-blocking extraction of media file metadata (ID3, Vorbis, base64 art) without loading the full file into memory. |
| **`electron-store`** | Persistent simple data storage | A schema-based JSON database used to persist user configurations, playlist states, and playback positions across sessions. |

---

## Quick Setup & Commands

**Clean install of all manifest dependencies:**
```bash
npm install