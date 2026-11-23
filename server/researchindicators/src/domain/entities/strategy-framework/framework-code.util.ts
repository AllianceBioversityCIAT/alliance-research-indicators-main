import { CODE_MAX_LENGTH } from './strategy-framework.constants';

/**
 * Next hierarchical element code and next `IOB-<n>` (design 5.3, R-STF-005,
 * D-STF-16). Pure: the caller passes every code in the uniqueness scope
 * (the portfolio, and for an IOB the portfolio's year). Gaps are not filled.
 *
 * @akili-spec institutional-performance/strategy-framework
 */

export interface CodeElement {
  id: number;
  parentId: number | null;
  depth: number;
  code: string;
}

export type CodeProposal =
  | { code: string }
  | { field: 'code'; description: string };

const PARENT_CODE_TOO_LONG = 'parent code too long to extend; type a code';

const ROOT_CODE = /^(\d+)$/i;
const IOB_CODE = /^IOB-(\d+)$/i;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const numericSuffixes = (
  elements: readonly { code: string }[],
  pattern: RegExp,
): string[] =>
  elements.flatMap((element) => {
    const match = pattern.exec(element.code.trim());
    return match ? [match[1]] : [];
  });

/** Highest digit-string + 1, or `1` when nothing matched. */
const maxPlusOne = (digitStrings: readonly string[]): string => {
  const max = digitStrings.reduce(
    (best, value) => (BigInt(value) > BigInt(best) ? value : best),
    '0',
  );
  return (BigInt(max) + 1n).toString();
};

const withinLimit = (code: string): CodeProposal =>
  code.length > CODE_MAX_LENGTH
    ? { field: 'code', description: PARENT_CODE_TOO_LONG }
    : { code };

/**
 * Root (`parentId` null): `<max n + 1>` over every code matching `^(\d+)$`,
 * whatever its depth. Child of parent `P`: `P.<max m + 1>` over every code
 * matching `^<escaped P>\.(\d+)$`, portfolio-wide — a moved element keeps its
 * code, so the scan is not limited to the parent's current children.
 */
export const proposeElementCode = (
  elements: readonly CodeElement[],
  parentId: number | null,
): CodeProposal => {
  if (parentId === null) {
    return withinLimit(maxPlusOne(numericSuffixes(elements, ROOT_CODE)));
  }

  const parent = elements.find((element) => element.id === parentId);
  if (!parent) {
    throw new Error(`parent ${parentId} is not in the portfolio`);
  }
  const parentCode = parent.code.trim();
  const pattern = new RegExp(`^${escapeRegExp(parentCode)}\\.(\\d+)$`, 'i');
  return withinLimit(
    `${parentCode}.${maxPlusOne(numericSuffixes(elements, pattern))}`,
  );
};

/** `IOB-<max + 1>` over codes matching `^IOB-(\d+)$`, case-insensitive. */
export const proposeIobCode = (codes: readonly string[]): CodeProposal => {
  const suffixes = codes.flatMap((code) => {
    const match = IOB_CODE.exec(code.trim());
    return match ? [match[1]] : [];
  });
  return { code: `IOB-${maxPlusOne(suffixes)}` };
};
