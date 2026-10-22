/**
 * A person's name as people read it: "ZUNIGA PINO, DANIELA" -> "Daniela Zuniga Pino".
 * Agresso stores names as "LAST NAMES, FIRST NAMES" in capitals; this puts the first names
 * first and capitalises the first letter of each word (also after a hyphen or apostrophe).
 * A name without a comma is only re-cased. Empty input gives ''.
 */
export function formatPersonName(raw: string | null | undefined): string {
  const value = (raw ?? '').trim().replace(/\s+/g, ' ');
  if (!value) return '';
  const comma = value.indexOf(',');
  const ordered = comma === -1 ? value : `${value.slice(comma + 1).trim()} ${value.slice(0, comma).trim()}`.trim();
  return ordered.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase());
}
