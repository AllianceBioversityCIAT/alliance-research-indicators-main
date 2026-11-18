import { ReportingPlatformEnum } from '../../../entities/results/enum/reporting-platform.enum';
import {
  parsePrmsRef,
  prmsExternalReferenceSql,
  prmsRef,
} from './prms-external-reference';

/**
 * Literals from design §7.1 / R-PPI-003, one per enum member.
 * A `Record` so a new platform fails to compile until its reference is named.
 */
const REFERENCE_FOR_CODE_123: Record<ReportingPlatformEnum, string> = {
  [ReportingPlatformEnum.STAR]: '123',
  [ReportingPlatformEnum.PRMS]: 'PRMS-123',
  [ReportingPlatformEnum.TIP]: 'TIP-123',
  [ReportingPlatformEnum.AICCRA]: 'AICCRA-123',
  [ReportingPlatformEnum.BILATERAL]: 'BILATERAL-123',
};

const REJECTED_REFERENCES: Array<string | null> = [
  'STAR-123',
  'tip-123',
  'TIP-007',
  'TIP-0',
  'TIP-',
  'TIP-12a',
  'XYZ-1',
  '9007199254740993',
  '',
  null,
];

/**
 * Reads the CASE fragment as SQL text (KZ-001). Substitutes the two column
 * tokens with literals and evaluates the WHEN/THEN/ELSE that the text names.
 * It does not call `prmsRef`.
 */
const evaluateReferenceSql = (
  sql: string,
  platform: string | null,
  code: number,
): string => {
  const platformLiteral = platform == null ? 'NULL' : `'${platform}'`;
  const rendered = sql
    .replace(/\bplatform_code\b/g, platformLiteral)
    .replace(/\bresult_official_code\b/g, String(code))
    .trim();
  const match = rendered.match(
    /^CASE\s+WHEN\s+(.+?)\s+THEN\s+(.+?)\s+ELSE\s+(.+?)\s+END$/s,
  );
  if (!match) {
    throw new Error(`SQL fragment is not a CASE expression: ${rendered}`);
  }
  const taken = evalEquality(match[1].trim())
    ? match[2].trim()
    : match[3].trim();
  return evalScalar(taken);
};

/**
 * Folds `COALESCE(a, b)` the way MySQL does: the first argument that is
 * not the NULL token. The NULL-platform case is red without this fold
 * only when the fragment itself contains COALESCE — dropping it leaves
 * `CONCAT(NULL, '-', code)`, which is not `prmsRef(STAR, code)`.
 */
const foldCoalesce = (expr: string): string => {
  let current = expr;
  for (let guard = 0; guard < 8; guard += 1) {
    const next = current.replace(
      /COALESCE\(([^()]*)\)/gi,
      (_match, args: string) => {
        const parts = splitSqlArgs(args);
        const chosen = parts.find(
          (part) => unquote(part).toUpperCase() !== 'NULL',
        );
        return chosen ?? 'NULL';
      },
    );
    if (next === current) {
      return current;
    }
    current = next;
  }
  return current;
};

const evalEquality = (expr: string): boolean => {
  const folded = foldCoalesce(expr);
  const parts = folded.split('=').map((part) => part.trim());
  if (parts.length !== 2) {
    throw new Error(`WHEN is not an equality: ${expr}`);
  }
  return unquote(parts[0]) === unquote(parts[1]);
};

const evalScalar = (expr: string): string => {
  const folded = foldCoalesce(expr);
  const cast = folded.match(/^CAST\((.+) AS CHAR\)$/i);
  if (cast) {
    return unquote(cast[1].trim());
  }
  const concat = folded.match(/^CONCAT\((.+)\)$/i);
  if (concat) {
    return splitSqlArgs(concat[1])
      .map((arg) => unquote(arg))
      .join('');
  }
  return unquote(folded);
};

const splitSqlArgs = (args: string): string[] => {
  const out: string[] = [];
  let current = '';
  let inQuote = false;
  for (const ch of args) {
    if (ch === "'") {
      inQuote = !inQuote;
      current += ch;
      continue;
    }
    if (ch === ',' && !inQuote) {
      out.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim() !== '') {
    out.push(current.trim());
  }
  return out;
};

const unquote = (token: string): string => {
  const trimmed = token.trim();
  if (trimmed.length >= 2 && trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
};

describe('prms external reference', () => {
  describe('prmsRef', () => {
    it.each(Object.values(ReportingPlatformEnum))(
      'emits the canonical reference for %s and code 123',
      (platform) => {
        expect(prmsRef(platform, 123)).toBe(REFERENCE_FOR_CODE_123[platform]);
      },
    );

    it('emits the bare code for STAR', () => {
      expect(prmsRef(ReportingPlatformEnum.STAR, 123)).toBe('123');
    });

    it('emits TIP-123 for TIP', () => {
      expect(prmsRef(ReportingPlatformEnum.TIP, 123)).toBe('TIP-123');
    });
  });

  describe('parsePrmsRef', () => {
    it.each(Object.values(ReportingPlatformEnum))(
      'round-trips %s',
      (platform) => {
        const ref = prmsRef(platform, 123);
        expect(parsePrmsRef(ref)).toEqual({ platform, code: 123 });
        expect(ref).toBe(REFERENCE_FOR_CODE_123[platform]);
      },
    );

    it.each(REJECTED_REFERENCES)('returns null for %j', (ref) => {
      expect(parsePrmsRef(ref)).toBeNull();
    });
  });

  describe('prmsExternalReferenceSql', () => {
    const sql = prmsExternalReferenceSql(
      'platform_code',
      'result_official_code',
    );

    it('names the platform and official-code columns', () => {
      expect(sql).toContain('platform_code');
      expect(sql).toContain('result_official_code');
    });

    it.each(Object.values(ReportingPlatformEnum))(
      'evaluates to prmsRef for %s',
      (platform) => {
        for (const code of [123, 1441061]) {
          expect(evaluateReferenceSql(sql, platform, code)).toBe(
            prmsRef(platform, code),
          );
        }
      },
    );

    it('reads a NULL platform as STAR, equal to prmsRef(STAR, code)', () => {
      expect(evaluateReferenceSql(sql, null, 123)).toBe(
        prmsRef(ReportingPlatformEnum.STAR, 123),
      );
    });

    it('accepts caller column aliases', () => {
      const aliased = prmsExternalReferenceSql(
        'r.platform_code',
        'r.result_official_code',
      );
      expect(aliased).toContain('r.platform_code');
      expect(aliased).toContain('r.result_official_code');
    });
  });
});
