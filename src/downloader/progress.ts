import type { JobProgress } from './types';

export function parseProgress(line: string): JobProgress {
  const [, status = '', downloaded = '', total = '', speed = '', eta = '', percentText = ''] = line.split('|');
  const percent = Math.max(0, Math.min(100, Number(percentText.replace('%', '').trim()) || (status === 'finished' ? 100 : 0)));
  return {
    percent,
    downloadedBytes: numberOrUndefined(downloaded),
    totalBytes: numberOrUndefined(total),
    speed: numberOrUndefined(speed),
    eta: numberOrUndefined(eta),
    phase: status === 'finished' ? 'Post-processing' : 'Downloading'
  };
}

function numberOrUndefined(value: unknown): number | undefined {
  const number = Number(value);
  return value !== '' && Number.isFinite(number) ? number : undefined;
}
