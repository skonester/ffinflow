#!/usr/bin/env bash
# fetch-linux-binaries.sh
# Linux counterpart of fetch-ffmpeg.ps1 + fetch-ytdlp.js, used by the Linux
# (flatpak) release workflow. Downloads:
#   - ffmpeg/ffprobe: static GPL linux64 build from BtbN/FFmpeg-Builds
#     (same "master-latest" GPL flavour the Windows build uses, so libx265,
#     libsvtav1, libvpx-vp9, ... are available), checked against the
#     release's checksums.sha256.
#   - yt-dlp: pinned, SHA-256-verified yt-dlp_linux build.
# It also drops the Windows .exe binaries so they don't end up in the
# Linux package.
set -euo pipefail

YTDLP_VERSION="2026.08.19"
YTDLP_SHA256="58162f9bfdc27458ea47bfcb311cf47028f17d8154a8bf7d689861d46399230a"
YTDLP_URL="https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp_linux"

FFMPEG_ASSET="ffmpeg-master-latest-linux64-gpl.tar.xz"
FFMPEG_BASE_URL="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest"

root="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ffmpeg_dir="${root}/ffmpeg-binaries"
ytdlp_dir="${root}/ytdlp-binaries"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

mkdir -p "$ffmpeg_dir" "$ytdlp_dir"

echo ">>> Downloading ${FFMPEG_ASSET} from BtbN/FFmpeg-Builds ..."
curl -fsSL --retry 3 -o "${work}/${FFMPEG_ASSET}" "${FFMPEG_BASE_URL}/${FFMPEG_ASSET}"
curl -fsSL --retry 3 -o "${work}/checksums.sha256" "${FFMPEG_BASE_URL}/checksums.sha256"
(cd "$work" && grep " ${FFMPEG_ASSET}\$" checksums.sha256 | sha256sum -c -)

tar -xJf "${work}/${FFMPEG_ASSET}" -C "$work"
install -m 755 "$work"/ffmpeg-*/bin/ffmpeg "${ffmpeg_dir}/ffmpeg"
install -m 755 "$work"/ffmpeg-*/bin/ffprobe "${ffmpeg_dir}/ffprobe"

echo ">>> Downloading yt-dlp_linux ${YTDLP_VERSION} ..."
curl -fsSL --retry 3 -o "${work}/yt-dlp" "$YTDLP_URL"
echo "${YTDLP_SHA256}  ${work}/yt-dlp" | sha256sum -c -
install -m 755 "${work}/yt-dlp" "${ytdlp_dir}/yt-dlp"

rm -f "$ffmpeg_dir"/*.exe "$ytdlp_dir"/*.exe

"${ffmpeg_dir}/ffmpeg" -hide_banner -version | head -n 1
"${ffmpeg_dir}/ffmpeg" -hide_banner -encoders | grep -E "libx265|libsvtav1|libvpx-vp9" || {
  echo "Expected GPL encoders missing from ffmpeg build" >&2
  exit 1
}
echo ">>> Linux binaries ready in ${ffmpeg_dir} and ${ytdlp_dir}"
