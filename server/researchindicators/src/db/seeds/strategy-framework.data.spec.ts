import { DEFAULT_LEVELS } from '../../domain/entities/strategy-framework/strategy-framework.constants';
import {
  SEED_ELEMENTS,
  SEED_IOB_YEAR,
  SEED_LEVELS,
  SEED_LINKS,
  SEED_OBJECTIVES,
  SEED_PORTFOLIO_ID,
  SEED_RESPONSIBLES,
} from './seed-data/strategy-framework.data';

/**
 * Recounts the committed seed constants (R-STF-011 AC.1, design section 3.4).
 *
 * The counts below are derived by walking these arrays. They are not a
 * summary the generator wrote beside the rows. This file cannot see the
 * workbooks, so a wrong constant still passes until a reader compares it
 * with the sources. That comparison is the generator's own assertions,
 * recorded in the seed task.
 */

const byDepth = (depth: number) =>
  SEED_ELEMENTS.filter((element) => element.depth === depth);

describe('strategy framework seed data (R-STF-011, design 3.4)', () => {
  it('recomputes 3 levels and 4 / 13 / 31 elements for portfolio 2, year 2026', () => {
    expect(SEED_PORTFOLIO_ID).toBe(2);
    expect(SEED_IOB_YEAR).toBe(2026);
    expect(SEED_LEVELS).toHaveLength(3);
    expect(SEED_LEVELS.map(({ id: _id, ...level }) => level)).toEqual(
      DEFAULT_LEVELS.map((level) => ({
        depth: level.depth,
        name: level.name,
        pluralName: level.plural_name,
        shortLabel: level.short_label,
        isIndicatorLevel: level.is_indicator_level,
      })),
    );
    expect(byDepth(1)).toHaveLength(4);
    expect(byDepth(2)).toHaveLength(13);
    expect(byDepth(3)).toHaveLength(31);
    expect(SEED_ELEMENTS).toHaveLength(48);
  });

  it('recomputes 28 objectives, 36 distinct links, both pre-merge names on 4.1.1, 4.6 absent, and only 1.3.2 unlinked', () => {
    expect(SEED_OBJECTIVES).toHaveLength(28);
    expect(SEED_LINKS).toHaveLength(36);

    const pairs = SEED_LINKS.map(
      (link) => `${link.objectiveCode}\0${link.elementCode}`,
    );
    expect(new Set(pairs).size).toBe(36);

    const linkedObjectives = new Set(
      SEED_LINKS.map((link) => link.objectiveCode),
    );
    expect(
      SEED_OBJECTIVES.map((objective) => objective.code).filter(
        (code) => !linkedObjectives.has(code),
      ),
    ).toEqual([]);

    const linkedElements = new Set(SEED_LINKS.map((link) => link.elementCode));
    expect(
      byDepth(3)
        .map((element) => element.code)
        .filter((code) => !linkedElements.has(code)),
    ).toEqual(['1.3.2']);

    expect(
      SEED_LINKS.filter((link) => link.elementCode === '4.1.1').map(
        (link) => link.sourceLabel,
      ),
    ).toEqual(
      expect.arrayContaining([
        '3.2.1 Innovation development',
        '4.1.1 Uptake of innovations for system change',
      ]),
    );

    expect(SEED_ELEMENTS.map((element) => element.code)).not.toContain('4.6');
    expect(
      SEED_ELEMENTS.some((element) => element.name.includes('Powering Impact')),
    ).toBe(false);
  });

  it('recomputes description presence from the stored strings: 22 indicators, 7 dimensions, area 1 included', () => {
    const described = (depth: number) =>
      byDepth(depth).filter((element) => element.description !== null).length;

    expect(described(3)).toBe(22);
    expect(described(2)).toBe(7);
    expect(SEED_ELEMENTS.some((element) => element.description === '')).toBe(
      false,
    );

    const descriptionOf = (code: string) =>
      SEED_ELEMENTS.find((element) => element.code === code)?.description;
    expect(descriptionOf('1')).toEqual(expect.any(String));
    expect((descriptionOf('1') ?? '').length).toBeGreaterThan(0);
    expect(descriptionOf('2')).toBeNull();
    expect((descriptionOf('3') ?? '').length).toBeGreaterThan(0);
    expect((descriptionOf('4') ?? '').length).toBeGreaterThan(0);
  });

  it('keeps unique codes and ids, with each child under the previous depth', () => {
    expect(new Set(SEED_ELEMENTS.map((element) => element.id)).size).toBe(
      SEED_ELEMENTS.length,
    );
    expect(new Set(SEED_ELEMENTS.map((element) => element.code)).size).toBe(
      SEED_ELEMENTS.length,
    );
    expect(new Set(SEED_OBJECTIVES.map((objective) => objective.id)).size).toBe(
      28,
    );
    expect(new Set(SEED_LINKS.map((link) => link.id)).size).toBe(36);

    const byCode = new Map(
      SEED_ELEMENTS.map((element) => [element.code, element]),
    );
    for (const element of SEED_ELEMENTS) {
      if (element.depth === 1) {
        expect(element.parentCode).toBeNull();
        continue;
      }
      const parent = byCode.get(element.parentCode ?? '');
      expect(parent).toBeDefined();
      expect(parent?.depth).toBe(element.depth - 1);
    }

    const indicatorCodes = new Set(byDepth(3).map((element) => element.code));
    for (const link of SEED_LINKS) {
      expect(indicatorCodes.has(link.elementCode)).toBe(true);
    }
    for (const responsible of SEED_RESPONSIBLES) {
      expect(indicatorCodes.has(responsible.elementCode)).toBe(true);
      expect(responsible.position).toBeGreaterThan(0);
    }
  });
});
