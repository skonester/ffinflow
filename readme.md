<div align="center">
  <img src="images/main.png" alt="ffinflow main interface" width="220" />
  <br/>
  <img src="images/player.png" alt="ffinflow player interface" width="560" />
</div>

# ffinflow

ffinflow is a modern Windows media player for people who liked the simple, direct feel of the classic Windows Media Player experience but want stronger support for today's media files.

The goal is not to become a streaming app, a media store, or a bloated library manager. ffinflow is meant to open your files quickly, keep the controls familiar, and use a better backend for modern containers, codecs, subtitles, playlists, and metadata.

> ffinflow is an independent project and is not affiliated with Microsoft or Windows Media Player.

## Why This Exists

Windows Media Player Legacy had a good rhythm: open a file, see the video, use obvious controls, manage a playlist, and keep moving. That style is still useful, but modern local media is messier than it used to be. MKV files, embedded subtitle tracks, unusual audio streams, HEVC/H.265 video, external subtitle formats, and large local libraries all need more help than older players were designed to provide.

ffinflow is being built as an updated answer to that gap:

- Familiar desktop player layout.
- Static, visible playback controls instead of hidden or over-designed interactions.
- Top-level menus for File, View, Playback, and Help.
- Direct buttons for previous, play/pause, next, volume, shuffle, repeat, speed, fullscreen, and playlist visibility.
- FFmpeg/FFprobe, MediaInfo, and process-managed conversion support for probing, remuxing, conversion, subtitle extraction, and modern media handling.
- Local-first behavior with saved preferences, saved playback position, and no account requirement.

## Player Experience

ffinflow keeps the main screen focused on playback.

- A video surface sits at the center of the app.
- Playback controls stay available in a stable control bar.
- Playlist controls remain close to the player.
- The Playback menu exposes common media actions for keyboard and menu-driven workflows.
- Media info is available when needed without turning the player into a diagnostics tool.

Current playback controls include:

- Play / pause
- Stop
- Previous / next
- Rewind and fast-forward by 10 seconds
- Time slider
- Volume and mute
- Shuffle
- Repeat playlist / repeat current
- Playback speed presets
- Fullscreen
- Playlist toggle

## Modern Media Backend

ffinflow uses Electron and Chromium for the player surface, then leans on media tooling where Chromium alone is not enough.

- `ffprobe` reads stream information and media details.
- `mediainfo.js` performs deeper container and stream inspection before playback fallback decisions.
- `execa` runs FFmpeg jobs from the main process with safer argument handling and cleaner process control.
- `ffmpeg` helps with unsupported containers, unsupported audio/video codecs, remuxing, and conversion paths.
- Embedded subtitles can be detected and extracted.
- External subtitle files can be discovered and loaded.
- `music-metadata` fills in title, artist, duration, and other metadata without blocking the UI.

This gives ffinflow a familiar frontend with a more capable backend underneath it.

## Playback Compatibility Layer

Before a file is handed to Chromium, ffinflow can prepare it for browser playback.

- Native-friendly formats such as MP4, WebM, MP3, WAV, OGG, AAC, M4A, FLAC, and OPUS are passed through directly.
- Browser-hostile containers such as FLV are inspected with MediaInfo.
- FLV files with browser-friendly streams, such as H.264 video with AAC or MP3 audio, are remuxed into a temporary MP4 without full re-encoding.
- FLV files with older or incompatible streams are converted into a temporary H.264/AAC MP4.
- Prepared playback files are written into the system temp directory under `ffinflow-media-cache`.

This fallback exists because Chromium's built-in demuxer can reject files that FFmpeg can still understand. Instead of surfacing repeated demuxer errors to the user, ffinflow tries to prepare a playable copy first.

## Supported Workflows

ffinflow currently supports:

- Opening one or more media files.
- Opening folders into a playlist.
- Dragging media files into the app.
- Saving and restoring playlists.
- Remembering playback position.
- Remembering volume and theme settings.
- Loading external subtitles.
- Extracting embedded subtitles.
- Adjusting subtitle timing.
- Preparing FLV and other non-native media for Chromium playback.
- Viewing media stream information.
- Using hardware acceleration when enabled.

## Supported Media

The app is designed around common local media formats:

- Video: `.mp4`, `.mkv`, `.avi`, `.webm`, `.mov`, `.flv`, `.m4v`, `.3gp`, `.wmv`, `.ts`
- Audio: `.mp3`, `.wav`, `.ogg`, `.aac`, `.m4a`, `.flac`, `.wma`, `.opus`
- Subtitles: `.srt`, `.vtt`, `.ass`, `.ssa`, `.sub`, `.ttml`, `.dfxp`

Actual playback support still depends on what Chromium can decode directly and what ffinflow can prepare through FFmpeg. Files that cannot be played directly may still work after remuxing or conversion into a temporary MP4.

## Menus And Controls

The app uses desktop-style menus so important features are not trapped behind only mouse gestures.

### File

- Open Files
- Open Folder
- Clear Playlist
- Exit

### View

- Toggle Media Info
- Change Theme

### Playback

- Play / Pause
- Stop
- Previous / Next
- Rewind / Fast Forward
- Shuffle
- Repeat
- Play Speed
- Mute
- Volume Up / Volume Down
- Fullscreen

### Help

- Remember Playback Position
- Hardware Acceleration
- Release Notes
- Keyboard Shortcuts
- Check for Updates
- About

## Project Structure

| File | Purpose |
| :--- | :--- |
| `main.js` | Electron main process, app lifecycle, FFmpeg path setup, file-open routing, media probing, MediaInfo inspection, and playback compatibility preparation. |
| `renderer.js` | Player UI orchestration, playlist state, playback controls, metadata display, menu events, and settings wiring. |
| `subtitles.js` | Subtitle discovery, embedded subtitle extraction, subtitle cache/state, and subtitle timing controls. |
| `menu-template.js` | Desktop app menu definitions for File, View, Playback, and Help. |
| `copyFFmpeg.js` | Copies binaries from `ffmpeg-static` and `ffprobe-static` into `ffmpeg-binaries/` after install. |
| `package.json` | npm scripts, Electron Builder config, dependency list, and packaged extra resources. |
| `src/` | Smaller UI, playback, filesystem, fullscreen, theme, hardware acceleration, and utility modules. |

## Development

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm start
```

Build the Windows installer:

```bash
npm run build
```

Publish through Electron Builder:

```bash
npm run publish
```

## FFmpeg Binaries

The project uses prebuilt FFmpeg and FFprobe binaries through npm:

- `ffmpeg-static`
- `ffprobe-static`

Additional media support packages:

- `mediainfo.js` for deeper media/container inspection.
- `execa` for safer FFmpeg process execution from Electron's main process.

After `npm install`, the `postinstall` script runs:

```bash
node copyFFmpeg.js
```

That script copies the downloaded binaries into:

```text
ffmpeg-binaries/
```

Electron Builder packages that directory through `build.extraResources`, so installed builds can load the binaries from:

```text
resources/ffmpeg-binaries/
```

The expected layout is:

```text
ffmpeg-binaries/
  ffmpeg.exe
  ffprobe.exe
```

## Custom FFmpeg Builds

Custom FFmpeg binaries can be used if the project needs custom codec flags, smaller binaries, reproducible release artifacts, or specific licensing choices.

To use custom binaries:

```bash
npm install
# Replace ffmpeg-binaries/ffmpeg.exe and ffmpeg-binaries/ffprobe.exe.
npm run build
```

## Git LFS

The Windows FFmpeg binaries are larger than GitHub's normal 100 MB file limit, so this repo tracks them with Git LFS.

The LFS rule lives in `.gitattributes`:

```text
ffmpeg-binaries/*.exe filter=lfs diff=lfs merge=lfs -text
```

After replacing either binary, stage it normally:

```bash
git add ffmpeg-binaries/ffmpeg.exe ffmpeg-binaries/ffprobe.exe
```

Git stores small pointer files in the commit and uploads the real executables through LFS during `git push`.

## Current Platform Focus

ffinflow is currently Windows-oriented.

- The packaged build expects `ffmpeg.exe` and `ffprobe.exe`.
- Electron Builder is configured for Windows NSIS output.
- Cross-platform packaging may be added later, but Windows desktop playback is the current priority.

## Roadmap

Planned direction:

- More complete static top buttons and menu actions.
- Audio and subtitle track selection menus.
- Better codec fallback flows and progress reporting for longer conversions.
- More polished playlist management.
- Improved media info and troubleshooting views.
- Release builds that feel like a ready Windows desktop media player, not a developer experiment.

## License

See [LICENSE](LICENSE).
