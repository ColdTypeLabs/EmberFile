export function applyTemplate(
  renameFormat: string,
  tag: string,
  matchCount: number
): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return renameFormat
    .replace('{tag}', tag)
    .replace('{date}', date)
    .replace('{index}', String(matchCount));
}
