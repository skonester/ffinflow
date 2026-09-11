import type { SupportedSite } from './types';

export function parseExtractors(output: string): SupportedSite[] {
  return output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const broken = /\(CURRENTLY BROKEN\)/i.test(line);
    const name = line.replace(/\s*\(CURRENTLY BROKEN\)/i, '');
    const type: SupportedSite['type'] = /^generic$/i.test(name) ? 'Generic' : /search/i.test(name) ? 'Search' : /live|stream/i.test(name) ? 'Live' : /playlist|channel|season|series|collection|album|user|profile|tab|set$|category/i.test(name) ? 'Collection' : 'Site';
    return { name, family: name.split(':')[0], broken, type };
  }).sort((a, b) => a.name.localeCompare(b.name));
}
