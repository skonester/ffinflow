export interface ClassifiedError { code: string; message: string; actions: string[] }

export function isBrowserCookieAccessError(raw: string): boolean {
  const text = raw.replace(/\x1b\[[0-9;]*m/g, '').toLowerCase();
  return /failed to decrypt with dpapi|cookie.*decrypt|app-bound encryption/.test(text)
    || /could not copy (?:chrome\s+)?cookie database/.test(text)
    || /(?:permissionerror|errno\s*13)[\s\S]{0,500}(?:network[\\/]+cookies|cookie database)/.test(text);
}

export function sanitizeEngineLog(raw: string): string {
  return raw
    .replace(/([a-z]:\\users\\)[^\\\r\n]+/gi, '$1[redacted]')
    .replace(/(cookie|authorization|token|password|secret)(\s*[:=]\s*)\S+/gi, '$1$2[redacted]')
    .slice(0, 2000);
}

export function classifyEngineError(raw: string): ClassifiedError {
  const text = raw.replace(/\x1b\[[0-9;]*m/g, '').trim();
  const lower = text.toLowerCase();
  if (/cloudflare|anti-bot|captcha|confirm you.re not a bot/.test(lower)) return { code: 'site_challenge', message: 'The website blocked this request with a browser or anti-bot challenge. Try again later or use the website directly.', actions: ['Open in browser', 'Retry later'] };
  if (isBrowserCookieAccessError(text)) return { code: 'cookie_decryption_failed', message: 'This media needs an authenticated browser session, which ffinflow does not support. Try a public URL instead.', actions: ['Retry'] };
  if (/sign in|login required|cookies|private video|members-only/.test(lower)) return { code: 'authentication_required', message: 'This media needs an authenticated session, which ffinflow does not support. Try a public URL instead.', actions: ['Retry'] };
  if (/429|too many requests|rate.?limit/.test(lower)) return { code: 'rate_limited', message: 'The website is temporarily rate-limiting requests. Wait before retrying.', actions: ['Retry later', 'Reduce concurrency'] };
  if (/geo|not available in your country|region/.test(lower)) return { code: 'geo_blocked', message: 'This media is not available in the current region.', actions: ['Open in browser'] };
  if (/drm|protected content/.test(lower)) return { code: 'drm_protected', message: 'This media is DRM-protected and ffinflow will not attempt to bypass it.', actions: ['Open in browser'] };
  if (/unsupported url|no suitable extractor/.test(lower)) return { code: 'unsupported_url', message: 'This website or URL is not currently supported by the installed engine.', actions: ['Open in browser'] };
  if (/requested format.*not available|no video formats/.test(lower)) return { code: 'format_unavailable', message: 'The requested quality or format is no longer available.', actions: ['Use Best Available', 'Analyze again'] };
  if (/disk full|no space left|errno 28/.test(lower)) return { code: 'disk_full', message: 'The destination drive does not have enough free space.', actions: ['Choose another folder', 'Free disk space'] };
  if (/permission denied|access is denied|errno 13/.test(lower)) return { code: 'permission_denied', message: 'Windows denied access to the selected download folder.', actions: ['Choose another folder'] };
  if (/removed|deleted|unavailable|does not exist/.test(lower)) return { code: 'removed_or_unavailable', message: 'The media was removed, made private, or is no longer available.', actions: ['Open in browser'] };
  if (/extractor|unable to extract|site changed/.test(lower)) return { code: 'engine_outdated', message: 'The website appears to have changed since this engine release.', actions: ['Retry'] };
  return { code: 'download_error', message: text.split('\n').filter(Boolean).slice(-1)[0]?.replace(/^ERROR:\s*/i, '') || 'The download could not be completed.', actions: ['Retry', 'Analyze again'] };
}
