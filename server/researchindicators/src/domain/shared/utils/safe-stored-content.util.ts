/** Max nesting depth when scanning json_value payloads. */
export const SAFE_STORED_JSON_MAX_DEPTH = 32;

/** Max serialized size (bytes) for json_value payloads. */
export const SAFE_STORED_JSON_MAX_BYTES = 512_000;

const FORBIDDEN_JSON_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Patterns that indicate XSS, script injection, or other unsafe stored content.
 * Intentionally narrower than query-sanitizer SQL rules so URLs and normal text stay valid.
 */
const DANGEROUS_STRING_PATTERNS: RegExp[] = [
  /\0/,
  /<script\b/i,
  /<\/script>/i,
  /<iframe\b/i,
  /<object\b/i,
  /<embed\b/i,
  /<\s*img[^>]+on\w+/i,
  /javascript\s*:/i,
  /vbscript\s*:/i,
  /data\s*:\s*text\/html/i,
  /\bon\w+\s*=/i,
  /expression\s*\(/i,
  /<\?php/i,
  /<%[\s@]/,
  /\\u003c/i,
];

export function containsDangerousStoredString(text: string): boolean {
  return DANGEROUS_STRING_PATTERNS.some((pattern) => pattern.test(text));
}

export function isSafeStoredString(text: string): boolean {
  if (typeof text !== 'string') {
    return false;
  }
  return !containsDangerousStoredString(text);
}

export function isSafeStoredJsonValue(value: unknown, depth = 0): boolean {
  if (depth > SAFE_STORED_JSON_MAX_DEPTH) {
    return false;
  }

  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === 'string') {
    return isSafeStoredString(value);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every((item) => isSafeStoredJsonValue(item, depth + 1));
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Reflect.ownKeys(record).every((key) => {
      if (typeof key !== 'string') {
        return false;
      }
      if (FORBIDDEN_JSON_KEYS.has(key)) {
        return false;
      }
      return isSafeStoredJsonValue(record[key], depth + 1);
    });
  }

  return false;
}

export function isSafeStoredJsonPayload(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  let serializedLength = 0;
  try {
    serializedLength = Buffer.byteLength(JSON.stringify(value), 'utf8');
  } catch {
    return false;
  }

  if (serializedLength > SAFE_STORED_JSON_MAX_BYTES) {
    return false;
  }

  return isSafeStoredJsonValue(value);
}
