const STRIP_PATTERNS = [
  // ISO dates: 2024-01-31, 20240131
  /\b\d{4}[-]?\d{2}[-]?\d{2}\b/gi,
  // US dates: 01-31-2024, 01/31/24
  /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/gi,
  // Month names (abbrev + full)
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi,
  // UUIDs: 8+ contiguous hex chars (covers MD5-style hashes and UUIDs)
  /\b[0-9a-f]{8,}(?:-[0-9a-f]{4,}){0,4}\b/gi,
  // Trailing numeric suffixes: _1, -001, (2), v3
  /[-_\s(v]*\d+[)\s]*$/gi,
  // Remaining standalone numbers
  /\b\d+\b/g,
];

export function computeFingerprint(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  const stem = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.slice(lastDot + 1).toLowerCase() : '';

  let normalized = stem.toLowerCase();
  for (const pattern of STRIP_PATTERNS) {
    normalized = normalized.replace(pattern, ' ');
  }

  // Collapse whitespace/separators, keep only alpha tokens
  const keywords = normalized
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join('-');

  if (keywords && ext) return `${keywords}.${ext}`;
  if (keywords) return keywords;
  return ext;
}
