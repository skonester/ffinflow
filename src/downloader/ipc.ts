import { BrowserWindow, dialog, ipcMain, shell } from 'electron';
import type { AnalyzeRequest, AppSettings, EnqueueRequest } from './types';
import { DownloaderStore } from './store';
import { DownloadEngine } from './engine';
import { assertLibraryPath, ensureDownloadFolders, libraryRoots, scanLibrary } from './library';

export function registerDownloaderIpc(window: BrowserWindow, store: DownloaderStore, engine: DownloadEngine): void {
  ipcMain.handle('downloader:app-info', async () => ({ engineVersion: await engine.version() }));
  ipcMain.handle('downloader:supported-sites', () => engine.supportedSites());
  ipcMain.handle('downloader:library', () => scanLibrary(store.getSettings().outputDirectory, store.listJobs(), store.getDownloadRoots()));
  ipcMain.handle('downloader:open-download-folder', async () => { const root = store.getSettings().outputDirectory; await ensureDownloadFolders(root); const error = await shell.openPath(root); if (error) throw new Error(error); });
  ipcMain.handle('downloader:analyze', (_event, request: AnalyzeRequest) => engine.analyze(assertObject(request)));
  ipcMain.handle('downloader:enqueue', (_event, request: EnqueueRequest) => engine.enqueue(assertObject(request)));
  ipcMain.handle('downloader:pause', (_event, id: string) => engine.pause(assertId(id)));
  ipcMain.handle('downloader:resume', (_event, id: string) => engine.resume(assertId(id)));
  ipcMain.handle('downloader:cancel', (_event, id: string) => engine.cancel(assertId(id)));
  ipcMain.handle('downloader:retry', (_event, id: string) => engine.retry(assertId(id)));
  ipcMain.handle('downloader:select-folder', async () => {
    const result = await dialog.showOpenDialog(window, { properties: ['openDirectory', 'createDirectory'], defaultPath: store.getSettings().outputDirectory });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle('downloader:reveal', async (_event, path: string) => { const safe = await assertLibraryPath([...libraryRoots(store.getSettings().outputDirectory, store.listJobs()), ...store.getDownloadRoots()], path); shell.showItemInFolder(safe); });
  ipcMain.handle('downloader:open', async (_event, path: string) => { const safe = await assertLibraryPath([...libraryRoots(store.getSettings().outputDirectory, store.listJobs()), ...store.getDownloadRoots()], path); const error = await shell.openPath(safe); if (error) throw new Error(error); });
  ipcMain.handle('downloader:history', () => store.listJobs());
  ipcMain.handle('downloader:remove-history', (_event, id: string) => store.removeJob(assertId(id)));
  ipcMain.handle('downloader:clear-history', () => store.clearHistory());
  ipcMain.handle('downloader:get-settings', () => store.getSettings());
  ipcMain.handle('downloader:update-settings', (_event, patch: Partial<AppSettings>) => store.updateSettings(assertObject(patch)));
  ipcMain.handle('downloader:get-logs', (_event, jobId?: string) => store.listLogs(jobId ? assertId(jobId) : undefined));
  ipcMain.handle('downloader:clear-logs', () => store.clearLogs());
}

function assertObject<T>(value: T): T { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid request.'); return value; }
function assertId(value: string): string { if (typeof value !== 'string' || !/^[a-f0-9-]{30,40}$/i.test(value)) throw new Error('Invalid job identifier.'); return value; }
