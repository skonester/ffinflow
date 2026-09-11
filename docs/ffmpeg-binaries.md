# ffmpeg-binaries provenance (read this if you just cloned the repo)

`ffmpeg-binaries/ffmpeg.exe` and `ffprobe.exe` are not tracked in git — they get placed there by one of two different mechanisms, and the two are **not equivalent**:

1. **`fetch-ffmpeg.ps1`** — downloads the full GPL static build from BtbN/FFmpeg-Builds (`ffmpeg-master-latest-win64-gpl.zip`). This is the one you want: it includes encoders like `libx265`, `libvpx-vp9`, `libaom-av1`, and `libsvtav1` (needed by Convert Media's MKV/AV1 option and by HEVC/AV1 handling in `preparation-service.ts`).
2. **`copyFFmpeg.js`** — runs automatically as the npm `postinstall` script, and copies from the `ffmpeg-static` / `ffprobe-static` npm packages instead. It only does this if `ffmpeg-binaries/` is still empty (`if (!fs.existsSync(ffmpegDest))`), so it won't clobber a full build you already fetched. But those npm packages ship **minimal LGPL builds — no libx265, no AV1, no VP9**.

If you run `npm install` before ever running `fetch-ffmpeg.ps1`, `ffmpeg-binaries/` will be empty at that point, `postinstall` will fill it with the minimal LGPL build, and:

- Convert Media's "MKV Video (AV1)" option will fail (no `libsvtav1` encoder).
- HEVC/AV1 source handling in `preparation-service.ts` will fail the same way.

**So: run `fetch-ffmpeg.ps1` before (or instead of relying on) `npm install`'s postinstall step**, or re-run it afterward to overwrite the minimal build. This hasn't been fixed at the tooling level yet — candidates: make `postinstall` call `fetch-ffmpeg.ps1` directly instead of falling back to the npm packages, or have `MediaPreparationService`/Convert Media detect a missing encoder and surface a clear error instead of a raw ffmpeg failure.
