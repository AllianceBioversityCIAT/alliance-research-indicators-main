import { readFileSync } from 'fs';
import { join } from 'path';

// @akili-spec institutional-performance/strategy-framework B-11 / D-STF-45.
// Each assertion reads one rule, cut at that rule's closing brace.

const odsAdmin = __dirname;
const partial = readFileSync(join(odsAdmin, 'ods-count-chips.scss'), 'utf8');

const rule = (source: string, selector: string): string => {
  const start = source.indexOf(selector);
  return source.slice(start, source.indexOf('}', start) + 1);
};

const hosts = ['framework/framework.component.scss', 'institutional-objectives/institutional-objectives.component.scss'];

describe('ods count chips', () => {
  it('paints the pill once, for both pages', () => {
    const chip = rule(partial, '.level-chip {');

    expect(chip).toContain('border-radius: 999px');
    expect(chip).toContain('background: var(--ac-grey-100)');
    expect(chip).toContain('color: var(--ac-grey-800)');
    expect(chip).toContain('font-weight: 600');
    expect(chip).toContain('font-size: 13px');
    expect(chip).toContain('padding: 4px 12px');
    expect(chip.endsWith('}')).toBe(true);
    expect(chip).not.toContain('.count-chips');

    const list = rule(partial, '.count-chips {');
    expect(list).toContain('gap: 8px');
    expect(list).toContain('margin: 0 0 12px');
    expect(list).toContain('list-style: none');
    expect(list.endsWith('}')).toBe(true);
    expect(list).not.toContain('.level-chip');
  });

  it('is included by the pages that paint the band, and not by the table', () => {
    for (const file of hosts) {
      const source = readFileSync(join(odsAdmin, file), 'utf8');
      expect(source).toContain("@use '../ods-count-chips'");
    }
    const tables = readFileSync(join(odsAdmin, 'framework/components/framework-tables/framework-tables.component.scss'), 'utf8');
    expect(tables).not.toContain('.level-chip');
  });
});
