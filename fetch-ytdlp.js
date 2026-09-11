// fetch-ytdlp.js
// Downloads a pinned, SHA-256-verified yt-dlp.exe release build used by the
// built-in downloader. Skips the download if a matching copy already exists.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const YTDLP_VERSION = '2026.08.19';
const YTDLP_SHA256 = '66674953fe251b89f4d08c5f0e35e0728679bd67ab3d7d05c0562af101dd3e7a';
const YTDLP_URL = `https://github.com/yt-dlp/yt-dlp/releases/download/${YTDLP_VERSION}/yt-dlp.exe`;

const destinationDir = path.join(__dirname, 'ytdlp-binaries');
const destination = path.join(destinationDir, 'yt-dlp.exe');

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

async function download(url) {
  const response = await fetch(url, { redirect: 'follow' });
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer());
}

async function main() {
  if (!fs.existsSync(destinationDir)) fs.mkdirSync(destinationDir, { recursive: true });

  if (fs.existsSync(destination)) {
    const existing = fs.readFileSync(destination);
    if (sha256(existing) === YTDLP_SHA256) {
      console.log(`yt-dlp.exe already present and verified (${YTDLP_VERSION}).`);
      return;
    }
  }

  console.log(`Fetching yt-dlp.exe ${YTDLP_VERSION}...`);
  const bytes = await download(YTDLP_URL);
  const actual = sha256(bytes);
  if (actual !== YTDLP_SHA256) throw new Error(`yt-dlp.exe checksum mismatch: expected ${YTDLP_SHA256}, received ${actual}`);
  fs.writeFileSync(destination, bytes);
  console.log(`yt-dlp.exe ${YTDLP_VERSION} verified and saved to ${destination}`);
}

main().catch((error) => {
  console.error('fetch-ytdlp.js failed:', error.message);
  process.exit(1);
});
