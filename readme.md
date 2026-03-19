# ffinflow

ffinflow is a minimalist media player built on the Electron framework. It leverages a decoupled architecture where Chromium handles the UI rendering and FFmpeg provides the underlying codec support and stream processing.

![ffinflow](images/main.png)

Technical Architecture
The application operates using a standard Electron multi-process model:

Main Process (Node.js): Manages the application lifecycle, native window OS configurations, and filesystem access. It serves as the host for the ffmpeg-static binaries and handles metadata extraction via music-metadata.

Renderer Process (Chromium): A hardware-accelerated frontend environment that executes the playerui.js logic and renders the video canvas.

IPC Bridge: High-speed asynchronous communication between the UI and the Node.js backend to handle file buffers, playlist states, and hardware acceleration switches.

Key Technical Features
Engine & Codec Support
FFmpeg Integration: Utilizes ffmpeg-static and fluent-ffmpeg to provide broad container compatibility, including .mkv, .avi, .flv, .mov, and .wmv.

Hardware Acceleration: Configured via Chromium switches (force_high_performance_gpu, enable-accelerated-video-decode) to offload decoding tasks from the CPU to the GPU.

Atomic Metadata Extraction: Non-blocking parsing of ID3, Vorbis, and MP4 tags, including embedded base64 cover art, via music-metadata.

Subtitle Management System
Format Compatibility: Supports internal stream extraction and external sidecar files (.srt, .vtt).

Heuristic Detection: Implements a directory-scanning algorithm to automatically associate external subtitle assets based on filename string matching.

State Persistence: Utilizes electron-store to maintain a local JSON database of user preferences per unique file hash (UID).

Playback Logic & UI
Event-Driven Controls: Volume attenuation via wheel-event listeners and global hotkey mapping for playback state management.

Dynamic Queue Management: Implements a drag-and-drop API for real-time playlist mutation, allowing for array-based shuffling and recursive looping.

Session Resumption: Caches the currentTime property of the media element to local storage, allowing for millisecond-precise playback resumption.


# Dependency,Purpose
electron,Application shell and window management
Electron acts as the core framework, integrating the Chromium rendering engine with the Node.js runtime to manage the application lifecycle and native OS window controls.

ffmpeg-static,Static binaries for cross-platform media processing
This package provides pre-compiled, standalone FFmpeg binaries, ensuring the application can decode and process diverse media formats without requiring a global FFmpeg installation on the host system.

fluent-ffmpeg,Fluent API for command-line FFmpeg interaction
A high-level abstraction layer that translates JavaScript commands into complex FFmpeg command-line arguments, allowing for programmatic control over media streams and processing events.

music-metadata,Stream-based metadata and cover art parser
A technical library used for non-blocking extraction of media file metadata, including ID3 tags, Vorbis comments, and embedded base64 cover art, without loading the full file into memory.

electron-store,Persistent simple data storage for user settings
A schema-based JSON database used to persist user configurations, playlist states, and playback positions across application sessions.


# Key commands for Electron/JSNode
------------------------------------------

Clean install of all manifest dependencies
npm install

Launch the application in a development environment
npm start

Generate a production-ready Windows executable
npm run build

If a standard npm install fails to resolve the dependency tree, execute the following command to manually force-install the core stack:

npm install electron@^28.3.3 ffmpeg-static@^5.2.0 ffprobe-static@^3.1.0 fluent-ffmpeg@^2.1.3 music-metadata@^7.14.0 srt-to-vtt@^1.1.3 subtitle@^4.2.1 webvtt-parser@^2.2.0 @electron/remote@^2.1.2 electron-log@^5.0.1 electron-store@^8.2.0 --save
