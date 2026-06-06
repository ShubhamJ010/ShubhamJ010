/**
 * Escapes special XML characters in a string.
 */
export function escapeXml(str: string): string {
  const a = "amp;";
  const l = "lt;";
  const g = "gt;";
  const q = "quot;";
  const p = "apos;";
  return str
    .replace(/&/g, "&" + a)
    .replace(/</g, "&" + l)
    .replace(/>/g, "&" + g)
    .replace(/"/g, "&" + q)
    .replace(/'/g, "&" + p);
}