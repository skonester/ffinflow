# ffinflow Debugging Guide

## Quick Reference

### Environment Variables
- `FFINFLOW_FFMPEG` - Path to ffmpeg executable (default: `ffmpeg-binaries/ffmpeg.exe`)
- `FFINFLOW_FFPROBE` - Path to ffprobe executable (default: `ffmpeg-binaries/ffprobe.exe`)

### Common Issues

#### 1. Media Playback Issues
- **Symptoms**: Video/audio not playing, stuttering, or silent
- **Debug steps**:
  1. Check ffmpeg/ffprobe paths are valid:
     ```powershell
     $ffmpegPath = $env:FFINFLOW_FFMPEG -or "ffmpeg-binaries\ffmpeg.exe"
     $ffprobePath = $env:FFINFLOW_FFPROBE -or "ffmpeg-binaries\ffprobe.exe"
     Test-Path $ffmpegPath
     Test-Path $ffprobePath
     ```
  2. Verify codec support with ffprobe:
     ```powershell
     ffprobe -v error -show_entries stream=codec_name,codec_type -of default=noprint_wrappers=1 input.mp4
     ```
  3. Check cache directory permissions:
     ```powershell
     $cacheDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "ffinflow-media-cache")
     Test-Path $cacheDir
     ```

#### 2. File Association Issues
- **Symptoms**: Double-clicking media files doesn't open ffinflow
- **Debug steps**:
  1. Verify registry entries exist:
     ```powershell
     Get-ItemProperty -Path "HKCU:\Software\Classes\.mp4" -ErrorAction SilentlyContinue
     Get-ItemProperty -Path "HKCU:\Software\Classes\.mkv" -ErrorAction SilentlyContinue
     ```
  2. Check ffinflow executable is accessible:
     ```powershell
     $exePath = [System.IO.Path]::Combine([System.IO.Path]::GetExecutablePath(), "..\..\dist\win-unpacked\ffinflow.exe")
     Test-Path $exePath
     ```

#### 3. Downloader UI Issues
- **Symptoms**: Download progress not updating, yt-dlp errors
- **Debug steps**:
  1. Check yt-dlp binary exists:
     ```powershell
     Test-Path "yt-dlp\yt-dlp.exe"
     ```
  2. Test yt-dlp directly:
     ```powershell
     yt-dlp --version
     yt-dlp --simulate --print "%(title)s|%(duration)s|%(filesize)s" "https://example.com/video"
     ```
  3. Verify cache directory is writable:
     ```powershell
     $cacheDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "ffinflow-media-cache")
     New-Item -ItemType Directory -Path $cacheDir -Force | Out-Null
     ```

#### 4. Update Check Issues
- **Symptoms**: Update toast not appearing, unable to check for updates
- **Debug steps**:
  1. Verify GitHub API access:
     ```powershell
     Invoke-RestMethod -Uri "https://api.github.com/repos/skonester/ffinflow/releases/latest" -Method Get
     ```
  2. Check renderer process is running:
     ```powershell
     Get-Process -Name "Electron" -ErrorAction SilentlyContinue
     ```

#### 5. Crash Issues
- **Symptoms**: ffinflow crashes on startup or during playback
- **Debug steps**:
  1. Enable verbose logging in `src/main.ts`:
     ```typescript
     // Add to existing logging setup
     console.log('MAIN:', 'Starting ffinflow');
     console.log('MAIN:', `ffmpegPath: ${FFMPEG_PATH}`);
     console.log('MAIN:', `ffprobePath: ${FFPROBE_PATH}`);
     console.log('MAIN:', `cacheDirectory: ${cacheDirectory}`);
     ```
  2. Check Electron crash dumps:
     ```powershell
     Get-ChildItem -Path "$env:LOCALAPPDATA\CrashDumps" -ErrorAction SilentlyContinue
     ```

### Diagnostic Commands

#### Full System Check
```powershell
# Check ffinflow installation
$exePath = [System.IO.Path]::Combine([System.IO.Path]::GetExecutablePath(), "..\..\dist\win-unpacked\ffinflow.exe")
Write-Host "FFINFLOW EXE:" (if (Test-Path $exePath) { "OK" } else { "MISSING" })

# Check ffmpeg/ffprobe
$ffmpegPath = $env:FFINFLOW_FFMPEG -or "ffmpeg-binaries\ffmpeg.exe"
$ffprobePath = $env:FFINFLOW_FFPROBE -or "ffmpeg-binaries\ffprobe.exe"
Write-Host "FFMPEG:" (if (Test-Path $ffmpegPath) { "OK" } else { "MISSING" })
Write-Host "FFPROBE:" (if (Test-Path $ffprobePath) { "OK" } else { "MISSING" })

# Check cache directory
$cacheDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "ffinflow-media-cache")
Write-Host "CACHE DIR:" (if (Test-Path $cacheDir) { "OK" } else { "MISSING" })

# Check yt-dlp
$ytDlpPath = [System.IO.Path]::Combine([System.IO.Path]::GetExecutablePath(), "..\yt-dlp\yt-dlp.exe")
Write-Host "YT-DLP:" (if (Test-Path $ytDlpPath) { "OK" } else { "MISSING" })

# Check registry associations
$videoProgId = "ffinflow.Video"
$audioProgId = "ffinflow.Audio"
Write-Host "VIDEO PROGID:" (if (Test-Path "HKCU:\Software\Classes\$videoProgId") { "OK" } else { "MISSING" })
Write-Host "AUDIO PROGID:" (if (Test-Path "HKCU:\Software\Classes\$audioProgId") { "OK" } else { "MISSING" })
```

#### Media File Analysis
```powershell
# Analyze a media file
$mediaFile = "path\to\your\video.mp4"
ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,duration -of default=noprint_wrappers=1 $mediaFile
```

### Log Locations

- **Main process logs**: Console output from `src/main.ts`
- **Renderer process logs**: Console output from `src/renderer.ts`
- **Electron crash dumps**: `$env:LOCALAPPDATA\CrashDumps`
- **Media cache**: `%TEMP%\ffinflow-media-cache`

### Reset Steps

To reset ffinflow to default state:

```powershell
# Remove registry associations
Remove-Item -Path "HKCU:\Software\Classes\.mp4" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.mkv" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.avi" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.webm" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.mov" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.wmv" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.flv" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.m4a" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.mp3" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.wav" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.ogg" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.opus" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.aac" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.flac" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.m4b" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.m4p" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.m4r" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.m4v" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.mk3d" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.mkv" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.webm" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.wmv" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.avi" -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\.mp4" -ErrorAction SilentlyContinue

# Remove ffinflow registry keys
Remove-Item -Path "HKCU:\Software\Classes\ffinflow.Video" -Recurse -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\ffinflow.Audio" -Recurse -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\Classes\ffinflow" -Recurse -ErrorAction SilentlyContinue
Remove-Item -Path "HKCU:\Software\RegisteredApplications\ffinflow" -ErrorAction SilentlyContinue

# Clear cache
$cacheDir = [System.IO.Path]::Combine([System.IO.Path]::GetTempPath(), "ffinflow-media-cache")
Remove-Item -Path $cacheDir -Recurse -Force -ErrorAction SilentlyContinue
```

### Testing Media Playback

```powershell
# Test with a known good file
$testFile = "path\to\test\video.mp4"
$ffmpegPath = $env:FFINFLOW_FFMPEG -or "ffmpeg-binaries\ffmpeg.exe"
$ffprobePath = $env:FFINFLOW_FFPROBE -or "ffmpeg-binaries\ffprobe.exe"

# Check file exists
if (-not (Test-Path $testFile)) {
    Write-Host "Test file not found: $testFile"
    exit 1
}

# Probe the file
Write-Host "Probing $testFile..."
ffprobe -v error -show_entries stream=codec_name,codec_type,width,height,duration -of default=noprint_wrappers=1 $testFile

# Try to decode with ffmpeg
Write-Host "Testing ffmpeg decode..."
ffmpeg -i $testFile -f null - 2>&1 | Select-String -Pattern "Error" -Context 2,2
```

### Known Limitations

- 8K video support requires `FFINFLOW_TEST_8K` environment variable (see `tests/preparation.test.cjs`)
- Some codecs may require additional ffmpeg libraries
- Windows file associations require administrator privileges to modify system-wide defaults

---

*Last updated: $(Get-Date -Format "yyyy-MM-dd")*
