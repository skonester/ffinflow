import Store from 'electron-store';
import { app } from 'electron';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import type { AppSettings, DownloadLogEntry, JobProgress, JobRecord, JobState } from './types';

const defaultProgress: JobProgress = { percent: 0, phase: 'Queued' };
const activeStates: JobState[] = ['analyzing', 'downloading', 'postprocessing'];

interface StoreShape {
  settings: Partial<AppSettings>;
  jobs: JobRecord[];
  logs: DownloadLogEntry[];
  downloadRoots: string[];
}

export class DownloaderStore {
  private readonly store: Store<StoreShape>;

  constructor() {
    this.store = new Store<StoreShape>({ name: 'downloader', defaults: { settings: {}, jobs: [], logs: [], downloadRoots: [] } });
    this.recoverInterruptedJobs();
  }

  private recoverInterruptedJobs(): void {
    const now = new Date().toISOString();
    let changed = false;
    const jobs = this.store.get('jobs', []).map((job) => {
      if (!activeStates.includes(job.state)) return job;
      changed = true;
      return { ...job, state: 'paused' as JobState, errorCode: undefined, errorMessage: 'The previous session ended before this download finished. Resume when ready.', progress: { ...job.progress, phase: 'Paused' }, updatedAt: now };
    });
    if (changed) this.store.set('jobs', jobs);
  }

  rememberDownloadRoot(path: string): void {
    const roots = this.store.get('downloadRoots', []);
    if (!roots.includes(path)) this.store.set('downloadRoots', [...roots, path]);
  }

  getDownloadRoots(): string[] { return this.store.get('downloadRoots', []); }

  getSettings(): AppSettings {
    const defaults: AppSettings = {
      outputDirectory: join(app.getPath('downloads'), 'ffinflow Downloads'),
      maxConcurrent: 2,
      keepPartialFiles: true,
      defaultQuality: '1080',
      defaultVideoContainer: 'mp4',
      defaultAudioContainer: 'mp3',
      retryLimit: 3,
      connectionTimeout: 30,
      concurrentFragments: 4,
      playlistPacing: 0.5,
      completionNotifications: true,
      completionSound: true,
      filenameStyle: 'title-id'
    };
    const merged: AppSettings = { ...defaults, ...this.store.get('settings', {}) };
    merged.maxConcurrent = Math.max(1, Math.min(4, Number(merged.maxConcurrent) || 2));
    merged.retryLimit = Math.max(1, Math.min(8, Number(merged.retryLimit) || 3));
    merged.connectionTimeout = Math.max(10, Math.min(120, Number(merged.connectionTimeout) || 30));
    merged.concurrentFragments = Math.max(1, Math.min(8, Number(merged.concurrentFragments) || 4));
    merged.playlistPacing = Math.max(0, Math.min(5, Number(merged.playlistPacing) || 0.5));
    return merged;
  }

  updateSettings(patch: Partial<AppSettings>): AppSettings {
    this.store.set('settings', { ...this.store.get('settings', {}), ...patch });
    if (patch.outputDirectory) this.rememberDownloadRoot(patch.outputDirectory);
    return this.getSettings();
  }

  createJob(input: Omit<JobRecord, 'createdAt' | 'updatedAt' | 'attempts' | 'progress'> & { progress?: JobProgress }): JobRecord {
    const now = new Date().toISOString();
    const job: JobRecord = { ...input, progress: input.progress ?? defaultProgress, attempts: 0, createdAt: now, updatedAt: now };
    this.store.set('jobs', [job, ...this.store.get('jobs', [])]);
    return job;
  }

  updateJob(id: string, patch: Partial<JobRecord>): JobRecord {
    const jobs = this.store.get('jobs', []);
    const index = jobs.findIndex((job) => job.id === id);
    if (index === -1) throw new Error(`Unknown download job: ${id}`);
    const next: JobRecord = { ...jobs[index], ...patch, updatedAt: new Date().toISOString() };
    const nextJobs = [...jobs];
    nextJobs[index] = next;
    this.store.set('jobs', nextJobs);
    return next;
  }

  getJob(id: string): JobRecord | undefined { return this.store.get('jobs', []).find((job) => job.id === id); }

  listJobs(): JobRecord[] { return [...this.store.get('jobs', [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }

  listRunnable(): JobRecord[] { return this.store.get('jobs', []).filter((job) => job.state === 'queued').sort((a, b) => a.createdAt.localeCompare(b.createdAt)); }

  removeJob(id: string): void {
    const job = this.getJob(id);
    if (!job) return;
    if (!['completed', 'cancelled'].includes(job.state)) throw new Error('Pause or cancel this item before removing it from history.');
    this.store.set('jobs', this.store.get('jobs', []).filter((existing) => existing.id !== id));
  }

  clearHistory(): void { this.store.set('jobs', this.store.get('jobs', []).filter((job) => !['completed', 'cancelled'].includes(job.state))); }

  ownsOutputPath(path: string): boolean { return this.store.get('jobs', []).some((job) => job.outputPath === path); }

  addLog(jobId: string | undefined, level: DownloadLogEntry['level'], message: string): DownloadLogEntry {
    const entry: DownloadLogEntry = { id: randomUUID(), jobId, level, message: message.slice(0, 2000), createdAt: new Date().toISOString() };
    this.store.set('logs', [entry, ...this.store.get('logs', [])].slice(0, 500));
    return entry;
  }

  listLogs(jobId?: string): DownloadLogEntry[] {
    const logs = this.store.get('logs', []);
    return jobId ? logs.filter((entry) => entry.jobId === jobId) : logs;
  }

  clearLogs(): void { this.store.set('logs', []); }
}
