import {
  assertTimeline,
  endTimeline,
  gapsOf,
  OrgTimelineInvariantError,
  reopenTimeline,
  TimelineVersion,
} from './org-version-timeline.util';

/**
 * Lifecycle operations of the timeline util (design 5.4, 5.5, D-ORG-11). Pure.
 * Expected values come from the R-ORG-007 / R-ORG-008 scenarios.
 */
const ver = (over: Partial<TimelineVersion> = {}): TimelineVersion => ({
  from: 2026,
  to: null,
  name: 'ORG-061',
  acronym: null,
  levelId: 23,
  parentId: 10,
  directorCarnet: null,
  ...over,
});
const ranges = (versions: TimelineVersion[]) =>
  versions.map((v) => [v.from, v.to]);

describe('endTimeline (inactivate / logical delete)', () => {
  it('ends the only version at E: [2026, null) from 2027 -> [2026, 2027)', () => {
    const result = endTimeline([ver({ id: 1 })], 2027);
    expect(result).toMatchObject({ ok: true, dropped: [] });
    if (!('versions' in result)) return;
    expect(ranges(result.versions)).toEqual([[2026, 2027]]);
    expect(result.versions[0].id).toBe(1);
    assertTimeline(result.versions, { ended: true });
  });

  it('ends the last of several versions and keeps the earlier ones untouched', () => {
    const result = endTimeline(
      [ver({ id: 1, from: 2026, to: 2028 }), ver({ id: 2, from: 2028 })],
      2030,
    );
    if ('violation' in result) throw new Error('expected ok');
    expect(ranges(result.versions)).toEqual([
      [2026, 2028],
      [2028, 2030],
    ]);
    assertTimeline(result.versions, { ended: true });
  });

  it('a version that starts exactly at E is dropped and returned for the log', () => {
    const result = endTimeline(
      [ver({ id: 1, from: 2026, to: 2027 }), ver({ id: 2, from: 2027 })],
      2027,
    );
    if ('violation' in result) throw new Error('expected ok');
    expect(ranges(result.versions)).toEqual([[2026, 2027]]);
    expect(result.dropped.map((v) => v.id)).toEqual([2]);
    assertTimeline(result.versions, { ended: true });
  });

  it('a version scheduled after E rejects (D-ORG-11), naming fromYear and the scheduled year', () => {
    const result = endTimeline(
      [ver({ id: 1, from: 2026, to: 2028 }), ver({ id: 2, from: 2028 })],
      2027,
    );
    expect(result.ok).toBe(false);
    if (!('violation' in result)) return;
    expect(result.violation.field).toBe('fromYear');
    expect(result.violation.description).toContain('2028');
  });

  it.each([2025, 2026])(
    'E = %i is not later than the first year (2026): rejected',
    (year) => {
      const result = endTimeline([ver()], year);
      expect(result.ok).toBe(false);
      if (!('violation' in result)) return;
      expect(result.violation.field).toBe('fromYear');
    },
  );

  it('never mutates its input', () => {
    const input = [ver({ id: 1 })];
    endTimeline(input, 2027);
    expect(input[0].to).toBeNull();
  });
});

describe('reopenTimeline (reactivate)', () => {
  const ended = [ver({ id: 1, from: 2026, to: 2027, name: 'Last values' })];

  it('from the year it ended: adds [2027, null) holding the last version values, no id', () => {
    const result = reopenTimeline(ended, 2027, 2027);
    if ('violation' in result) throw new Error('expected ok');
    expect(ranges(result.versions)).toEqual([
      [2026, 2027],
      [2027, null],
    ]);
    expect(result.added).toMatchObject({
      name: 'Last values',
      parentId: 10,
      levelId: 23,
    });
    expect(result.added.id).toBeUndefined();
    assertTimeline(result.versions, { ended: false });
  });

  it('from a later year leaves the years in between without a version', () => {
    const result = reopenTimeline(ended, 2029, 2027);
    if ('violation' in result) throw new Error('expected ok');
    expect(ranges(result.versions)).toEqual([
      [2026, 2027],
      [2029, null],
    ]);
    expect(gapsOf(result.versions)).toEqual([{ from: 2027, to: 2029 }]);
    // an unexpected gap is a bug; the declared one is accepted
    expect(() => assertTimeline(result.versions, { ended: false })).toThrow(
      OrgTimelineInvariantError,
    );
    expect(() =>
      assertTimeline(result.versions, {
        ended: false,
        gaps: [{ from: 2027, to: 2029 }],
      }),
    ).not.toThrow();
  });

  it('from before the year it ended is rejected', () => {
    const result = reopenTimeline(ended, 2026, 2027);
    expect(result.ok).toBe(false);
    if (!('violation' in result)) return;
    expect(result.violation.field).toBe('fromYear');
  });
});

describe('assertTimeline gaps (D-ORG-17): the result has exactly the declared gaps', () => {
  const gap = [{ from: 2027, to: 2029 }];
  const gapped = [ver({ from: 2026, to: 2027 }), ver({ from: 2029 })];

  it('still rejects an overlap and an open-ended version that is not last', () => {
    expect(() =>
      assertTimeline([ver({ from: 2026, to: 2029 }), ver({ from: 2028 })], {
        ended: false,
        gaps: [],
      }),
    ).toThrow(OrgTimelineInvariantError);
    expect(() =>
      assertTimeline([ver({ from: 2026, to: null }), ver({ from: 2028 })], {
        ended: false,
        gaps: gap,
      }),
    ).toThrow(OrgTimelineInvariantError);
  });

  it('gapsOf is empty for a contiguous timeline', () => {
    expect(
      gapsOf([ver({ from: 2026, to: 2028 }), ver({ from: 2028 })]),
    ).toEqual([]);
  });

  it('a gap the result LACKS is a bug: the version before the gap stretched across it', () => {
    const stretched = [ver({ from: 2026, to: 2029 })];
    expect(() => assertTimeline(stretched, { ended: true, gaps: gap })).toThrow(
      /gaps are none, expected \[2027, 2029\)/,
    );
  });

  it('a gap the result has but was not declared, or moved, is a bug', () => {
    expect(() => assertTimeline(gapped, { ended: false })).toThrow(
      OrgTimelineInvariantError,
    );
    expect(() =>
      assertTimeline([ver({ from: 2026, to: 2028 }), ver({ from: 2029 })], {
        ended: false,
        gaps: gap,
      }),
    ).toThrow(OrgTimelineInvariantError);
  });

  it('the declared gap, kept as it was, is accepted', () => {
    expect(() =>
      assertTimeline(gapped, { ended: false, gaps: gap }),
    ).not.toThrow();
  });
});

describe('endTimeline across a gap (D-ORG-17, T-03 review)', () => {
  const gapped = () => [
    ver({ id: 1, from: 2026, to: 2027 }),
    ver({ id: 2, from: 2029 }),
  ];

  it('ending at the version that follows the gap is a fromYear violation naming the year, and the input is unchanged', () => {
    const input = gapped();
    const result = endTimeline(input, 2029);
    expect(result.ok).toBe(false);
    if (!('violation' in result)) return;
    expect(result.violation.field).toBe('fromYear');
    expect(result.violation.description).toContain('2029');
    expect(result.violation.description).toContain('later year');
    expect(input).toEqual(gapped());
  });

  it('ending from a later year keeps the gap and ends the last version', () => {
    const result = endTimeline(gapped(), 2031);
    if ('violation' in result) throw new Error('expected ok');
    expect(ranges(result.versions)).toEqual([
      [2026, 2027],
      [2029, 2031],
    ]);
    expect(gapsOf(result.versions)).toEqual([{ from: 2027, to: 2029 }]);
  });
});
