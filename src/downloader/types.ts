export type JobState = 'queued' | 'analyzing' | 'downloading' | 'postprocessing' | 'paused' | 'completed' | 'blocked' | 'cancelled';
export type MediaKind = 'video' | 'audio';
export type VideoContainer = 'auto' | 'mp4' | 'mkv' | 'webm';
export type AudioContainer = 'best' | 'mp3' | 'm4a' | 'opus' | 'wav';

export interface FormatInfo {
  id: string;
  label: string;
  extension: string;
  width?: number;
  height?: number;
  fps?: number;
  videoCodec?: string;
  audioCodec?: string;
  bitrate?: number;
  size?: number;
  protocol?: string;
}

export interface MediaEntry {
  id: string;
  url: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  selected: boolean;
}

export interface MediaAnalysis {
  url: string;
  id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  uploader?: string;
  isLive: boolean;
  isPlaylist: boolean;
  entries: MediaEntry[];
  formats: FormatInfo[];
  extractor?: string;
  notice?: string;
}

export interface AnalyzeRequest {
  url: string;
}

export interface DownloadOptions {
  kind: MediaKind;
  quality: 'best' | '4320' | '2160' | '1440' | '1080' | '720' | '480' | '360' | '240' | '144';
  videoContainer: VideoContainer;
  audioContainer: AudioContainer;
  audioQuality: 'best' | '320' | '256' | '192' | '128';
  exactFormatId?: string;
  outputDirectory: string;
}

export interface EnqueueRequest {
  analysis: MediaAnalysis;
  selectedEntryIds: string[];
  options: DownloadOptions;
}

export interface JobProgress {
  percent: number;
  downloadedBytes?: number;
  totalBytes?: number;
  speed?: number;
  eta?: number;
  phase: string;
  message?: string;
}

export interface JobRecord {
  id: string;
  parentId?: string;
  sourceUrl: string;
  title: string;
  thumbnail?: string;
  state: JobState;
  progress: JobProgress;
  options: DownloadOptions;
  outputPath?: string;
  size?: number;
  errorCode?: string;
  errorMessage?: string;
  attempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  outputDirectory: string;
  maxConcurrent: number;
  keepPartialFiles: boolean;
  defaultQuality: DownloadOptions['quality'];
  defaultVideoContainer: VideoContainer;
  defaultAudioContainer: AudioContainer;
  retryLimit: number;
  connectionTimeout: number;
  concurrentFragments: number;
  playlistPacing: number;
  completionNotifications: boolean;
  completionSound: boolean;
  filenameStyle: 'title-id' | 'title-only';
}

export interface DownloadLogEntry {
  id: string;
  jobId?: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  createdAt: string;
}

export type FileCategory = 'Audio' | 'Video' | 'Image' | 'Application' | 'Zip' | 'Others';
export interface DownloadedFile { path: string; name: string; category: FileCategory; extension: string; size: number; modifiedAt: string; folder: string; missing: boolean }
export interface FileLibrary { root: string; files: DownloadedFile[]; warnings: string[] }
export interface SupportedSite { name: string; family: string; broken: boolean; type: 'Site' | 'Collection' | 'Live' | 'Search' | 'Generic' }
export interface SupportedDirectory { version: string; sites: SupportedSite[] }
