import { basename, extname } from "node:path";
import { parse, type ParseResult } from "parsium-media";

// Parsium is tuned for scene/torrent video names; music names like
// "01 - Artist - Song.mp3" get misread as episodes, so audio keeps its raw name.
const videoExtensions = new Set([".mp4", ".mkv", ".avi", ".webm", ".mov", ".flv", ".m4v", ".3gp", ".wmv", ".ts"]);

export interface ReleaseInfo {
  displayTitle: string;
  details: string[];
  parsed: ParseResult;
}

const danglingWord = /\s(in|of|the|and|a|an|to|at|on|for|with|from|by)$/i;

const pad = (n: number): string => String(n).padStart(2, "0");

function episodeLabel(parsed: ParseResult): string {
  const seasons = parsed.seasons ?? [];
  const episodes = parsed.episodes ?? [];
  const first = episodes[0];
  const last = episodes[episodes.length - 1];
  const episodePart = first === undefined ? "" : first === last ? `E${pad(first)}` : `E${pad(first)}-E${pad(last!)}`;

  if (seasons.length === 1) return `S${pad(seasons[0]!)}${episodePart}`;
  if (seasons.length > 1) return `S${pad(seasons[0]!)}-S${pad(seasons[seasons.length - 1]!)}`;
  if (first === undefined) return "";
  return first === last ? `Episode ${first}` : `Episodes ${first}-${last}`;
}

export function describeRelease(filePath: string): ReleaseInfo | null {
  if (!videoExtensions.has(extname(filePath).toLowerCase())) return null;

  let parsed: ParseResult;
  try {
    parsed = parse(basename(filePath));
  } catch {
    return null;
  }
  if (!parsed.title) return null;

  // A title ending on a connector means a tag was cut out mid-sentence
  // ("Yellowstone National Park in 8K 60P" -> "Yellowstone National Park in").
  if (danglingWord.test(parsed.title)) {
    return { displayTitle: basename(filePath, extname(filePath)), details: [], parsed };
  }

  const episode = episodeLabel(parsed);
  const displayTitle = episode
    ? `${parsed.title} - ${episode}`
    : parsed.year ? `${parsed.title} (${parsed.year})` : parsed.title;

  const details = [parsed.resolution, parsed.source, parsed.releaseGroup].filter((d): d is string => Boolean(d));
  return { displayTitle, details, parsed };
}

const normalizeTitle = (title: string): string => title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

const sameNumbers = (a: number[] = [], b: number[] = []): boolean =>
  a.length === b.length && a.every((n, i) => n === b[i]);

// True when a subtitle file names the same movie/episode as the video, even if the
// release tags differ ("The Boys S05E02.en.srt" vs "The.Boys.S05E02.1080p.WEB-TyHD.mkv").
export function isSameRelease(videoPath: string, subtitlePath: string): boolean {
  let video: ParseResult;
  let subtitle: ParseResult;
  try {
    video = parse(basename(videoPath));
    subtitle = parse(basename(subtitlePath));
  } catch {
    return false;
  }

  const title = normalizeTitle(video.title);
  if (!title || title !== normalizeTitle(subtitle.title)) return false;
  if (!sameNumbers(video.episodes, subtitle.episodes)) return false;
  if (video.seasons?.length && subtitle.seasons?.length && !sameNumbers(video.seasons, subtitle.seasons)) return false;
  if (video.year && subtitle.year && video.year !== subtitle.year) return false;
  return true;
}
