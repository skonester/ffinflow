import { Notification, shell } from 'electron';
import { execFile, spawn, type ChildProcessByStdio } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import type { Readable } from 'node:stream';
import type { AnalyzeRequest, DownloadLogEntry, EnqueueRequest, FormatInfo, JobProgress, JobRecord, MediaAnalysis, MediaEntry, SupportedDirectory } from './types';
import { DownloaderStore } from './store';
import { classifyEngineError, sanitizeEngineLog } from './errors';
import { buildFormatArguments } from './format';
import { parseProgress } from './progress';
import { categories } from './library';
import { parseExtractors } from './sites';

const execFileAsync = promisify(execFile);

export interface DownloadEngineOptions {
  ytDlpPath: string;
  ffmpegDir: string;
  ffprobePath: string;
}

export class DownloadEngine {
  private readonly running = new Map<string, ChildProcessByStdio<null, Readable, Readable>>();
  private readonly stopped = new Map<string, 'paused' | 'cancelled'>();
  private scheduling = false;

  constructor(
    private readonly store: DownloaderStore,
    private readonly options: DownloadEngineOptions,
    private readonly notify: (job: JobRecord) => void,
    private readonly notifyLog?: (entry: DownloadLogEntry) => void
  ) {}

  hasActiveJobs(): boolean { return this.running.size > 0; }

  async shutdown(): Promise<void> {
    const children = [...this.running.entries()];
    for (const [id, child] of children) {
      this.stopped.set(id, 'paused');
      await stopProcessTree(child.pid);
    }
  }

  async version(): Promise<string> {
    const { stdout } = await execFileAsync(this.options.ytDlpPath, ['--version'], { windowsHide: true, timeout: 20_000 });
    return stdout.trim();
  }

  async supportedSites(): Promise<SupportedDirectory> {
    const [version, result] = await Promise.all([this.version(), this.runCapture(['--ignore-config', '--list-extractors'], 60_000)]);
    return { version, sites: parseExtractors(result.stdout) };
  }

  async analyze(request: AnalyzeRequest): Promise<MediaAnalysis> {
    const url = validateUrl(request.url);
    const args = ['--ignore-config', '--dump-single-json', '--skip-download', '--no-warnings', '--flat-playlist', url];
    const { stdout } = await this.runCapture(args, 120_000);
    return normalizeAnalysis(url, JSON.parse(stdout) as Record<string, unknown>);
  }

  enqueue(request: EnqueueRequest): JobRecord[] {
    const selected = request.analysis.isPlaylist
      ? request.analysis.entries.filter((entry) => request.selectedEntryIds.includes(entry.id))
      : [{ id: request.analysis.id, url: request.analysis.url, title: request.analysis.title, thumbnail: request.analysis.thumbnail, selected: true }];
    if (!selected.length) throw new Error('Select at least one item to download.');
    if (!request.options || typeof request.options.outputDirectory !== 'string' || !request.options.outputDirectory.trim()) throw new Error('Choose a download folder.');
    if (!['audio', 'video'].includes(request.options.kind)) throw new Error('Choose video or audio output.');
    if (!['auto', 'mp4', 'mkv', 'webm'].includes(request.options.videoContainer)) throw new Error('Unknown video container.');
    if (!['best', 'mp3', 'm4a', 'opus', 'wav'].includes(request.options.audioContainer)) throw new Error('Unknown audio format.');
    const root = resolve(request.options.outputDirectory);
    this.store.rememberDownloadRoot(root);
    for (const category of categories) mkdirSync(join(root, category), { recursive: true });
    const outputDirectory = join(root, request.options.kind === 'audio' ? 'Audio' : 'Video');
    const parentId = request.analysis.isPlaylist ? randomUUID() : undefined;
    const jobs = selected.map((entry) => this.store.createJob({
      id: randomUUID(), parentId, sourceUrl: entry.url || request.analysis.url, title: entry.title || 'Untitled media',
      thumbnail: entry.thumbnail, state: 'queued', options: { ...request.options, outputDirectory }
    }));
    jobs.forEach(this.notify);
    jobs.forEach((job) => this.log(job.id, 'info', `Queued ${job.title}`));
    void this.schedule();
    return jobs;
  }

  async pause(id: string): Promise<void> {
    const child = this.running.get(id);
    if (child) {
      this.stopped.set(id, 'paused');
      await stopProcessTree(child.pid);
      this.log(id, 'warning', 'Download paused; partial data was preserved.');
    } else {
      const job = this.store.getJob(id);
      if (job?.state === 'queued') this.notify(this.store.updateJob(id, { state: 'paused', progress: { ...job.progress, phase: 'Paused' } }));
    }
  }

  async cancel(id: string): Promise<void> {
    const child = this.running.get(id);
    if (child) {
      this.stopped.set(id, 'cancelled');
      await stopProcessTree(child.pid);
      this.log(id, 'warning', 'Download cancelled.');
    } else {
      const job = this.store.getJob(id);
      if (job) this.notify(this.store.updateJob(id, { state: 'cancelled', progress: { ...job.progress, phase: 'Cancelled' } }));
    }
  }

  resume(id: string): void {
    const job = this.store.getJob(id);
    if (!job || !['paused', 'blocked', 'cancelled'].includes(job.state)) throw new Error('This download cannot be resumed.');
    this.notify(this.store.updateJob(id, { state: 'queued', errorCode: undefined, errorMessage: undefined, progress: { ...job.progress, phase: 'Queued' } }));
    void this.schedule();
  }

  retry(id: string): void { this.resume(id); }

  private async schedule(): Promise<void> {
    if (this.scheduling) return;
    this.scheduling = true;
    try {
      while (true) {
        const limit = this.store.getSettings().maxConcurrent;
        const capacity = limit - this.running.size;
        if (capacity <= 0) break;
        const next = this.store.listRunnable().slice(0, capacity);
        if (!next.length) break;
        next.forEach((job) => void this.startJob(job));
        await new Promise((resolvePromise) => setTimeout(resolvePromise, 50));
      }
    } finally { this.scheduling = false; }
  }

  private async startJob(job: JobRecord): Promise<void> {
    const settings = this.store.getSettings();
    const outputTemplate = join(job.options.outputDirectory, settings.filenameStyle === 'title-only' ? '%(title).180B.%(ext)s' : '%(title).180B [%(id)s].%(ext)s');
    const args = [
      '--ignore-config', '--newline',
      ...(settings.keepPartialFiles ? ['--continue', '--part'] : ['--no-continue', '--no-part']), '--no-overwrites',
      '--retries', String(settings.retryLimit * 2), '--fragment-retries', String(settings.retryLimit * 3), '--file-access-retries', String(settings.retryLimit + 2),
      '--retry-sleep', 'http:exp=1:20', '--retry-sleep', 'fragment:exp=1:20',
      '--socket-timeout', String(settings.connectionTimeout), '--concurrent-fragments', String(settings.concurrentFragments), '--sleep-requests', String(settings.playlistPacing),
      '--windows-filenames', '--trim-filenames', '180', '--output', outputTemplate,
      '--encoding', 'utf-8',
      '--progress-template', 'download:__FFINFLOW_PROGRESS__|%(progress.status)s|%(progress.downloaded_bytes)s|%(progress.total_bytes,progress.total_bytes_estimate)s|%(progress.speed)s|%(progress.eta)s|%(progress._percent_str)s',
      '--print', 'after_move:__FFINFLOW_FILE__%(filepath)s', '--ffmpeg-location', this.options.ffmpegDir,
      ...buildFormatArguments(job.options), job.sourceUrl
    ];
    const child = spawn(this.options.ytDlpPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    this.running.set(job.id, child);
    let current = this.store.updateJob(job.id, { state: 'downloading', attempts: job.attempts + 1, errorCode: undefined, errorMessage: undefined, progress: { ...job.progress, phase: 'Starting' } });
    this.notify(current);
    this.log(job.id, 'info', `Started attempt ${current.attempts} with ${job.options.kind === 'audio' ? job.options.audioContainer.toUpperCase() : `${job.options.quality === 'best' ? 'best quality' : `${job.options.quality}p`} ${job.options.videoContainer.toUpperCase()}`}.`);
    let stdoutBuffer = '';
    let stderr = '';
    let finalPath: string | undefined;
    const startedAt = Date.now();
    let lastPhase = '';
    const consumeLine = (line: string): void => {
      if (line.startsWith('__FFINFLOW_PROGRESS__')) {
        const progress = parseProgress(line);
        current = this.store.updateJob(job.id, { state: progress.phase === 'Post-processing' ? 'postprocessing' : 'downloading', progress });
        this.notify(current);
        if (progress.phase !== lastPhase) { lastPhase = progress.phase; this.log(job.id, 'info', progress.phase); }
      } else if (line.startsWith('__FFINFLOW_FILE__')) {
        finalPath = line.slice('__FFINFLOW_FILE__'.length).trim();
        this.log(job.id, 'info', 'yt-dlp reported the final output path.');
      }
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdoutBuffer += chunk;
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() ?? '';
      for (const line of lines) consumeLine(line);
    });
    child.stderr.on('data', (chunk: string) => {
      stderr = `${stderr}${chunk}`.slice(-32_000);
      for (const line of chunk.split(/\r?\n/)) {
        if (/^(?:WARNING|ERROR):/i.test(line.trim())) this.log(job.id, /error/i.test(line) ? 'error' : 'warning', sanitizeEngineLog(line));
      }
    });
    child.on('error', (error) => { stderr += `\n${error.message}`; });
    child.on('close', async (code) => {
      if (stdoutBuffer.trim()) consumeLine(stdoutBuffer.trim());
      this.running.delete(job.id);
      const stopped = this.stopped.get(job.id);
      this.stopped.delete(job.id);
      const latest = this.store.getJob(job.id) ?? current;
      if (stopped) {
        this.notify(this.store.updateJob(job.id, { state: stopped, progress: { ...latest.progress, phase: stopped === 'paused' ? 'Paused' : 'Cancelled' } }));
      } else if (code === 0) {
        const resolvedPath = this.resolveFinalPath(finalPath, job, startedAt);
        if (!resolvedPath) {
          this.block(job.id, latest, 'missing_output', 'yt-dlp finished but ffinflow could not locate the output file.');
          void this.schedule();
          return;
        }
        const validation = await this.validateOutput(resolvedPath, job.options.kind === 'video' && job.options.videoContainer === 'mp4');
        if (validation.valid) {
          this.notify(this.store.updateJob(job.id, { state: 'completed', outputPath: resolvedPath, size: validation.size, progress: { percent: 100, phase: 'Completed' } }));
          this.log(job.id, 'success', `Completed and verified ${resolvedPath}.`);
          if (settings.completionNotifications && Notification.isSupported()) new Notification({ title: 'Download complete', body: job.title }).show();
          if (settings.completionSound) shell.beep();
        }
        else this.block(job.id, latest, 'invalid_output', validation.message);
      } else if (latest.attempts < settings.retryLimit && isTransient(stderr)) {
        const retry = this.store.updateJob(job.id, { state: 'queued', errorMessage: 'A temporary error occurred. ffinflow will retry automatically.', progress: { ...latest.progress, phase: `Retrying (${latest.attempts + 1}/${settings.retryLimit})` } });
        this.notify(retry);
        this.log(job.id, 'warning', `Temporary failure; automatic retry ${latest.attempts + 1} of ${settings.retryLimit} scheduled.`);
        setTimeout(() => void this.schedule(), Math.min(20_000, 1500 * 2 ** latest.attempts));
      } else {
        const classified = classifyEngineError(stderr);
        this.block(job.id, latest, classified.code, classified.message);
      }
      void this.schedule();
    });
  }

  private block(id: string, job: JobRecord, code: string, message: string): void {
    this.notify(this.store.updateJob(id, { state: 'blocked', errorCode: code, errorMessage: message, progress: { ...job.progress, phase: 'Needs attention' } }));
    this.log(id, 'error', message);
  }

  private log(jobId: string | undefined, level: DownloadLogEntry['level'], message: string): void {
    const entry = this.store.addLog(jobId, level, sanitizeEngineLog(message));
    this.notifyLog?.(entry);
  }

  private async validateOutput(path: string, requireMp4 = false): Promise<{ valid: boolean; size?: number; message: string }> {
    try {
      const size = statSync(path).size;
      if (size <= 0) return { valid: false, message: 'The completed output file was empty.' };
      const { stdout } = await execFileAsync(this.options.ffprobePath, ['-v', 'error', '-show_entries', 'format=duration,format_name:stream=codec_type', '-of', 'json', path], { windowsHide: true, timeout: 30_000 });
      const metadata = JSON.parse(stdout);
      if (!metadata.streams?.length) return { valid: false, message: 'The output has no playable media streams.' };
      if (requireMp4 && (!/\.mp4$/i.test(path) || !metadata.format?.format_name?.split(',').includes('mp4'))) return { valid: false, message: 'The output is not a verified MP4. Choose MP4 and retry.' };
      return { valid: true, size, message: '' };
    } catch (error) { return { valid: false, message: `FFprobe could not validate the output: ${error instanceof Error ? error.message : String(error)}` }; }
  }

  private resolveFinalPath(reportedPath: string | undefined, job: JobRecord, startedAt: number): string | undefined {
    const recovered = recoverFinalOutputPath(reportedPath, job.options.outputDirectory, job.sourceUrl, startedAt);
    if (recovered && recovered !== reportedPath) this.log(job.id, 'warning', 'Recovered the completed output from the download folder after Windows changed the reported filename encoding.');
    return recovered;
  }

  private async runCapture(args: string[], timeout: number): Promise<{ stdout: string; stderr: string }> {
    try {
      const result = await execFileAsync(this.options.ytDlpPath, args, { windowsHide: true, timeout, maxBuffer: 64 * 1024 * 1024 });
      return { stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      const detail = error as Error & { stderr?: string };
      const raw = detail.stderr || detail.message;
      const classified = classifyEngineError(raw);
      throw new EngineRunError(raw, classified.message);
    }
  }
}

function validateUrl(value: string): string {
  const trimmed = value.trim();
  const url = new URL(trimmed);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Enter a valid http:// or https:// media URL.');
  return url.toString();
}

function normalizeAnalysis(url: string, raw: Record<string, unknown>): MediaAnalysis {
  const entriesRaw = Array.isArray(raw.entries) ? raw.entries.filter(Boolean) as Array<Record<string, unknown>> : [];
  const isPlaylist = entriesRaw.length > 0 || raw._type === 'playlist';
  const entries: MediaEntry[] = entriesRaw.map((entry, index) => ({
    id: String(entry.id ?? index), url: String(entry.webpage_url ?? entry.url ?? url), title: String(entry.title ?? `Item ${index + 1}`),
    thumbnail: getThumbnail(entry), duration: numberOrUndefined(entry.duration), uploader: stringOrUndefined(entry.uploader), selected: true
  }));
  const formatsRaw = Array.isArray(raw.formats) ? raw.formats as Array<Record<string, unknown>> : [];
  const formats: FormatInfo[] = formatsRaw.map((format) => ({
    id: String(format.format_id ?? ''), label: String(format.format ?? format.format_note ?? format.format_id ?? 'Unknown'), extension: String(format.ext ?? ''),
    width: numberOrUndefined(format.width), height: numberOrUndefined(format.height), fps: numberOrUndefined(format.fps),
    videoCodec: stringOrUndefined(format.vcodec), audioCodec: stringOrUndefined(format.acodec), bitrate: numberOrUndefined(format.tbr),
    size: numberOrUndefined(format.filesize ?? format.filesize_approx), protocol: stringOrUndefined(format.protocol)
  })).filter((format) => format.id && !['mhtml', 'jpg', 'png'].includes(format.extension));
  return {
    url, id: String(raw.id ?? 'media'), title: String(raw.title ?? 'Untitled media'), thumbnail: getThumbnail(raw),
    duration: numberOrUndefined(raw.duration), uploader: stringOrUndefined(raw.uploader ?? raw.channel), isLive: Boolean(raw.is_live), isPlaylist,
    entries, formats, extractor: stringOrUndefined(raw.extractor_key ?? raw.extractor)
  };
}

function getThumbnail(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.thumbnail === 'string') return raw.thumbnail;
  const thumbnails = Array.isArray(raw.thumbnails) ? raw.thumbnails as Array<Record<string, unknown>> : [];
  const value = thumbnails.at(-1)?.url;
  return typeof value === 'string' ? value : undefined;
}

function numberOrUndefined(value: unknown): number | undefined { const number = Number(value); return Number.isFinite(number) ? number : undefined; }
function stringOrUndefined(value: unknown): string | undefined { return typeof value === 'string' && value !== 'none' ? value : undefined; }

function isTransient(stderr: string): boolean { return /timed? out|temporary|connection|reset by peer|http error 5\d\d|fragment|network is unreachable|remote end closed/i.test(stderr); }
function extractMediaId(value?: string): string | undefined {
  if (!value) return undefined;
  const bracket = value.match(/\[([A-Za-z0-9_-]{5,})\](?:\.[^\\/]+)?$/)?.[1];
  if (bracket) return bracket;
  try { return new URL(value).searchParams.get('v') ?? value.match(/youtu\.be\/([A-Za-z0-9_-]{5,})/)?.[1]; } catch { return undefined; }
}
export function recoverFinalOutputPath(reportedPath: string | undefined, outputDirectory: string, sourceUrl: string, startedAt: number): string | undefined {
  if (reportedPath && existsSync(reportedPath)) return reportedPath;
  const mediaId = extractMediaId(reportedPath) ?? extractMediaId(sourceUrl);
  return readdirSync(outputDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.endsWith('.part') && !entry.name.endsWith('.ytdl'))
    .map((entry) => join(outputDirectory, entry.name))
    .filter((path) => {
      try { const stat = statSync(path); return stat.size > 0 && (mediaId ? path.includes(`[${mediaId}]`) : stat.mtimeMs >= startedAt - 10_000); } catch { return false; }
    })
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

class EngineRunError extends Error { constructor(readonly detail: string, message: string) { super(message); } }

async function stopProcessTree(pid?: number): Promise<void> {
  if (!pid) return;
  if (process.platform !== 'win32') { try { process.kill(pid, 'SIGTERM'); } catch { /* already stopped */ } return; }
  await new Promise<void>((resolvePromise) => execFile('taskkill', ['/PID', String(pid), '/T'], { windowsHide: true }, () => resolvePromise()));
}
