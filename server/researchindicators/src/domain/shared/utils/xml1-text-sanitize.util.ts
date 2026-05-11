/**
 * XML 1.0 `Char` (W3C REC-xml) — text nodes in OOXML (e.g. SpreadsheetML `sharedStrings.xml`)
 * must only contain these scalar values. Reusable anywhere you serialize user text into XML 1.0.
 *
 * @see https://www.w3.org/TR/xml/#charsets
 */

/** Whether `cp` is allowed as a single Unicode scalar in XML 1.0 text content. */
export function isXml10TextCodePoint(cp: number): boolean {
  if (cp === 0x9 || cp === 0xa || cp === 0xd) {
    return true;
  }
  if (cp < 0x20) {
    return false;
  }
  if (cp <= 0xd7ff) {
    return true;
  }
  if (cp >= 0xe000 && cp <= 0xfffd) {
    return true;
  }
  if (cp < 0x1_0000 || cp > 0x10_ff_ff) {
    return false;
  }
  if ((cp & 0xffff) >= 0xfffe) {
    return false;
  }
  return true;
}

/**
 * Strips characters illegal in XML 1.0 text (controls except TAB/LF/CR, noncharacters U+FFFE/U+FFFF
 * at end of planes, unpaired surrogates). Use before writing to `.xlsx`, `.docx`, or any XML 1.0 payload.
 */
export function sanitizeXml1Text(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; ) {
    const cp = s.codePointAt(i)!;
    const w = cp > 0xffff ? 2 : 1;
    if (isXml10TextCodePoint(cp)) {
      out += String.fromCodePoint(cp);
    }
    i += w;
  }
  return out;
}
