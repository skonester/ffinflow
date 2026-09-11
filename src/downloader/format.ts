import type { DownloadOptions } from './types';

export function buildFormatArguments(options: DownloadOptions): string[] {
  if (options.kind === 'audio') {
    const args = ['--format', options.exactFormatId || 'bestaudio/best', '--extract-audio', '--audio-format', options.audioContainer];
    if (options.audioQuality !== 'best') args.push('--audio-quality', `${options.audioQuality}K`);
    return args;
  }
  const cap = options.quality === 'best' ? '' : `[height<=${options.quality}]`;
  const selector = options.videoContainer === 'mp4'
    ? `bestvideo*${cap}[ext=mp4]+bestaudio[ext=m4a]/best${cap}[ext=mp4]/bestvideo*${cap}+bestaudio/best${cap}/best`
    : `bestvideo*${cap}+bestaudio/best${cap}/best`;
  const args = ['--format', options.exactFormatId || selector];
  if (options.videoContainer !== 'auto') {
    args.push('--merge-output-format', options.videoContainer);
    // Re-encode non-MP4 input when necessary; exact streams still honor output.
    args.push('--recode-video', options.videoContainer);
    if (options.videoContainer === 'mp4') args.push('--postprocessor-args', 'VideoConvertor+ffmpeg_o:-c:v libx264 -crf 20 -preset medium -pix_fmt yuv420p -c:a aac -movflags +faststart');
  }
  return args;
}
