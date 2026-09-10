import { extname } from "node:path";

export interface MediaStream {
  index: number;
  codec_type: string;
  codec_name?: string;
  channels?: number;
  width?: number;
  height?: number;
  disposition?: { attached_pic?: number };
}

export interface MediaProbe {
  streams: MediaStream[];
  format?: { duration?: string | number };
}

export interface PreparationPlan {
  kind: "direct" | "remux" | "audio" | "convert";
  video: Array<{ stream: MediaStream; codec: "copy" | "libx264" }>;
  audio: Array<{ stream: MediaStream; codec: "copy" | "flac" | "aac" }>;
}

// Codec/container policy, not a promise of hardware decoding support on every PC.
const nativeCodecs: Record<string, { video: string[]; audio: string[] }> = {
  ".mp4": { video: ["h264", "hevc", "av1", "vp9"], audio: ["aac", "mp3", "flac", "opus"] },
  ".webm": { video: ["vp8", "vp9", "av1"], audio: ["opus", "vorbis"] },
  ".mp3": { video: [], audio: ["mp3"] },
  ".wav": { video: [], audio: ["pcm_s16le", "pcm_u8", "pcm_s24le", "pcm_s32le", "pcm_f32le"] },
  ".ogg": { video: [], audio: ["vorbis", "opus", "flac"] },
  ".aac": { video: [], audio: ["aac"] },
  ".flac": { video: [], audio: ["flac"] },
  ".opus": { video: [], audio: ["opus"] },
};
nativeCodecs[".m4v"] = nativeCodecs[".mp4"]!;
nativeCodecs[".m4a"] = nativeCodecs[".mp4"]!;

export function createPreparationPlan(filePath: string, probe: MediaProbe): PreparationPlan {
  const video = probe.streams.filter(s => s.codec_type === "video" && !s.disposition?.attached_pic);
  const audio = probe.streams.filter(s => s.codec_type === "audio");
  if (!video.length && !audio.length) throw new Error("No playable audio or video streams were found.");
  const native = nativeCodecs[extname(filePath).toLowerCase()];
  const direct = native !== undefined &&
    video.every(s => native.video.includes(s.codec_name ?? "")) &&
    audio.every(s => native.audio.includes(s.codec_name ?? ""));
  const mp4 = nativeCodecs[".mp4"]!;
  const videos = video.map(stream => ({ stream, codec: (direct || mp4.video.includes(stream.codec_name ?? "") ? "copy" : "libx264") as "copy" | "libx264" }));
  const convertsVideo = videos.some(s => s.codec === "libx264");
  const audios = audio.map(stream => ({ stream, codec: (direct ? "copy" : convertsVideo ? "aac" : mp4.audio.includes(stream.codec_name ?? "") ? "copy" : "flac") as "copy" | "flac" | "aac" }));
  return {
    kind: direct ? "direct" : convertsVideo ? "convert" : audios.some(s => s.codec !== "copy") ? "audio" : "remux",
    video: videos,
    audio: audios,
  };
}

export function buildPreparationArgs(input: string, output: string, plan: PreparationPlan): string[] {
  if (plan.kind === "direct") throw new Error("Direct playback does not require FFmpeg.");
  const args = ["-hide_banner", "-nostdin", "-v", "error", "-n", "-i", input];
  for (const { stream } of [...plan.video, ...plan.audio]) args.push("-map", `0:${stream.index}`);
  args.push("-map_metadata", "0", "-map_chapters", "0", "-sn", "-dn");
  plan.video.forEach(({ stream, codec }, index) => {
    args.push(`-c:v:${index}`, codec);
    if (codec === "libx264") args.push(`-preset:v:${index}`, "veryfast", `-crf:v:${index}`, "23", `-pix_fmt:v:${index}`, "yuv420p", `-filter:v:${index}`, "pad=ceil(iw/2)*2:ceil(ih/2)*2");
    if (codec === "copy" && stream.codec_name === "hevc") args.push(`-tag:v:${index}`, "hvc1");
  });
  plan.audio.forEach(({ codec }, index) => {
    args.push(`-c:a:${index}`, codec);
    if (codec === "flac") args.push(`-compression_level:a:${index}`, "0");
    if (codec === "aac") args.push(`-b:a:${index}`, "192k");
  });
  // No -ac: preserve channel count instead of forcing stereo/7.1 into 5.1.
  return [...args, "-movflags", "+faststart", "-progress", "pipe:1", "-nostats", "-f", "mp4", output];
}
