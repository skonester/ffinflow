import { mkdir, readdir, lstat, realpath } from 'node:fs/promises';
import { basename, dirname, extname, isAbsolute, join, relative, resolve } from 'node:path';
import type { DownloadedFile, FileCategory, FileLibrary, JobRecord } from './types';

export const categories: FileCategory[] = ['Audio', 'Video', 'Image', 'Application', 'Zip', 'Others'];
const extensions: Record<string, FileCategory> = {};
for (const [category, values] of Object.entries({ Audio: 'mp3 m4a aac opus ogg oga wav flac wma aiff alac', Video: 'mp4 webm mkv mov avi m4v flv wmv ts mpeg mpg', Image: 'jpg jpeg png webp gif bmp svg avif heic tiff ico', Application: 'exe msi msix appx apk dmg pkg appimage bat cmd ps1 vbs js lnk url scr com', Zip: 'zip 7z rar tar gz bz2 xz tgz zst' })) {
  for (const extension of values.split(' ')) extensions[extension] = category as FileCategory;
}
export function categoryFor(path: string): FileCategory { return extensions[extname(path).slice(1).toLowerCase()] ?? 'Others'; }
export function isWithin(root: string, path: string): boolean { const rel = relative(resolve(root), resolve(path)); return rel !== '' && rel !== '..' && !rel.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) && !isAbsolute(rel); }
export async function ensureDownloadFolders(root: string): Promise<void> { await Promise.all(categories.map((category) => mkdir(join(resolve(root), category), { recursive: true }))); }

// A renderer can open only a real file inside a configured/recorded output root.
// Canonical paths prevent junctions and symlinks from escaping that boundary.
export async function assertLibraryPath(roots: string[], path: string): Promise<string> {
  if (typeof path !== 'string' || !isAbsolute(path)) throw new Error('Invalid file path.');
  const canonical = await realpath(path);
  const stat = await lstat(path);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('Select a regular downloaded file.');
  for (const root of roots) {
    try { if (isWithin(await realpath(root), canonical)) return canonical; } catch { /* unavailable root */ }
  }
  throw new Error('This file is outside the download folders.');
}

export function libraryRoots(root: string, jobs: JobRecord[]): string[] {
  return [...new Set([resolve(root), ...jobs.map((job) => resolve(job.options.outputDirectory))])];
}

export async function scanLibrary(root: string, jobs: JobRecord[], rememberedRoots: string[] = []): Promise<FileLibrary> {
  const files = new Map<string, DownloadedFile>();
  const warnings: string[] = [];
  const visited = new Set<string>();
  const roots = [...new Set([...libraryRoots(root, jobs), ...rememberedRoots])];
  let count = 0;
  const walk = async (directory: string, depth: number): Promise<void> => {
    if (depth > 32 || count >= 100_000) { warnings.push('Scan limit reached; narrow your download folder.'); return; }
    let canonical: string;
    try { canonical = await realpath(directory); } catch { warnings.push(`Folder unavailable: ${directory}`); return; }
    if (visited.has(canonical)) return;
    visited.add(canonical);
    try {
      for (const entry of await readdir(directory, { withFileTypes: true })) {
        if (++count > 100_000) { warnings.push('Scan limit reached; narrow your download folder.'); break; }
        if (entry.isSymbolicLink() || entry.name.startsWith('.') || /\.(part|ytdl|tmp|temp)$/i.test(entry.name)) continue;
        const path = join(directory, entry.name);
        if (entry.isDirectory()) { await walk(path, depth + 1); continue; }
        if (!entry.isFile()) continue;
        try {
          const stat = await lstat(path);
          files.set(resolve(path), { path, name: entry.name, category: categoryFor(path), extension: extname(path).slice(1).toUpperCase() || '—', size: stat.size, modifiedAt: stat.mtime.toISOString(), folder: directory, missing: false });
        } catch { warnings.push(`Could not read: ${entry.name}`); }
      }
    } catch { warnings.push(`Could not read folder: ${directory}`); }
  };
  for (const directory of roots) await walk(directory, 0);
  for (const job of jobs) if (job.outputPath && job.state === 'completed' && !files.has(resolve(job.outputPath))) {
    // A missing record stays visible, with open/reveal disabled.
    try { await lstat(job.outputPath); continue; } catch { /* missing */ }
    files.set(resolve(job.outputPath), { path: job.outputPath, name: basename(job.outputPath), category: categoryFor(job.outputPath), extension: extname(job.outputPath).slice(1).toUpperCase(), size: job.size ?? 0, modifiedAt: job.updatedAt, folder: dirname(job.outputPath), missing: true });
  }
  return { root, files: [...files.values()], warnings: [...new Set(warnings)] };
}
