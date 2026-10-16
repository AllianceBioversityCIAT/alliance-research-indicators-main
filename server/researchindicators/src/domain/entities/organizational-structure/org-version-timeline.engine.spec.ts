import {
  applyChange,
  assertTimeline,
  changedVersions,
  findCovering,
  OrgTimelineInvariantError,
  TimelineVersion,
} from './org-version-timeline.util';

/**
 * The save-engine functions of the timeline util (design 5.2 steps 5-6, 3.2
 * I-1/I-2). Pure, no I/O. Expected values come from the R-ORG-004 scenarios,
 * not from re-deriving the util's own arithmetic.
 */
const ver = (over: Partial<TimelineVersion> = {}): TimelineVersion => ({
  from: 2026,
  to: null,
  name: 'Data Science',
  acronym: null,
  levelId: 23,
  parentId: 10,
  directorCarnet: 'A',
  ...over,
});

const ranges = (versions: TimelineVersion[]) =>
  versions.map((v) => [v.from, v.to]);

describe('findCovering', () => {
  const timeline = [ver({ from: 2026, to: 2028 }), ver({ from: 2028 })];
  it.each([
    [2025, undefined],
    [2026, 2026],
    [2027, 2026],
    [2028, 2028],
    [2099, 2028],
  ])('year %i is covered by the version starting %s', (year, start) => {
    expect(findCovering(timeline, year)?.from).toBe(start);
  });
});

describe('applyChange sequences (R-ORG-004)', () => {
  it('a change in the start year of a version edits it in place (typo fix)', () => {
    const result = applyChange([ver({ id: 1 })], 2026, {
      name: 'Data Sciences',
    });
    expect(result.kind).toBe('edit_in_place');
    expect(ranges(result.versions)).toEqual([[2026, null]]);
    expect(result.versions[0]).toMatchObject({ id: 1, name: 'Data Sciences' });
    expect(result.diff).toEqual({
      name: { old: 'Data Science', new: 'Data Sciences' },
    });
    assertTimeline(result.versions, { ended: false });
  });

  it('a change after the start year splits: old values keep [a, Y), new values get [Y, b)', () => {
    const result = applyChange([ver({ id: 1, parentId: 10 })], 2027, {
      parentId: 30,
    });
    expect(result.kind).toBe('new_version');
    expect(ranges(result.versions)).toEqual([
      [2026, 2027],
      [2027, null],
    ]);
    expect(result.versions[0]).toMatchObject({ id: 1, parentId: 10 });
    expect(result.versions[1].id).toBeUndefined();
    expect(result.versions[1]).toMatchObject({
      parentId: 30,
      name: 'Data Science',
    });
    assertTimeline(result.versions, { ended: false });
  });

  it('splitting a bounded version keeps its old end on the new half', () => {
    const result = applyChange([ver({ from: 2026, to: 2030 })], 2028, {
      name: 'Renamed',
    });
    expect(ranges(result.versions)).toEqual([
      [2026, 2028],
      [2028, 2030],
    ]);
    assertTimeline(result.versions, { ended: true });
  });

  it('create -> split -> in place -> back-date, asserting the timeline after every step', () => {
    let timeline: TimelineVersion[] = [
      ver({ from: 2024, name: 'N0', parentId: 1 }),
    ];
    assertTimeline(timeline, { ended: false });

    timeline = applyChange(timeline, 2026, { parentId: 2 }).versions; // split
    assertTimeline(timeline, { ended: false });
    expect(ranges(timeline)).toEqual([
      [2024, 2026],
      [2026, null],
    ]);

    timeline = applyChange(timeline, 2026, { name: 'N1' }).versions; // in place
    assertTimeline(timeline, { ended: false });
    expect(timeline.map((v) => v.name)).toEqual(['N0', 'N1']);

    timeline = applyChange(timeline, 2025, { acronym: 'ACR' }).versions; // back-date split inside [2024, 2026)
    assertTimeline(timeline, { ended: false });
    expect(ranges(timeline)).toEqual([
      [2024, 2025],
      [2025, 2026],
      [2026, null],
    ]);
    // the acronym was null in the later version, i.e. it held the replaced value, so it follows
    expect(timeline.map((v) => v.acronym)).toEqual([null, 'ACR', 'ACR']);
  });

  it('a Y that no version covers is a programming error (the service bounds Y first)', () => {
    expect(() =>
      applyChange([ver({ from: 2026 })], 2025, { name: 'x' }),
    ).toThrow();
    expect(() =>
      applyChange([ver({ from: 2026, to: 2027 })], 2027, { name: 'x' }),
    ).toThrow();
  });

  it('a change equal to the current values is a no-op (nothing to write or log)', () => {
    const before = [ver({ id: 1 })];
    const result = applyChange(before, 2027, { name: 'Data Science' });
    expect(result.kind).toBe('none');
    expect(result.diff).toEqual({});
    expect(result.versions).toEqual(before);
  });

  it('does not mutate its input', () => {
    const before = [ver({ id: 1 })];
    const snapshot = JSON.stringify(before);
    applyChange(before, 2027, { name: 'Changed' });
    expect(JSON.stringify(before)).toBe(snapshot);
  });

  describe('propagation to later versions (R-ORG-004 "A later deliberate change is kept")', () => {
    // DIFFERENT values per version, so "kept" and "overwritten" give different answers.
    const later = () => [
      ver({
        id: 1,
        from: 2026,
        to: 2028,
        name: 'Data Science',
        directorCarnet: 'A',
      }),
      ver({
        id: 2,
        from: 2028,
        to: null,
        name: 'Data & AI',
        directorCarnet: 'B',
      }),
    ];

    it('a name fix from 2026 changes only [2026, 2028) and keeps Data & AI', () => {
      const { versions } = applyChange(later(), 2026, {
        name: 'Data Sciences',
      });
      expect(versions.map((v) => v.name)).toEqual([
        'Data Sciences',
        'Data & AI',
      ]);
    });

    it('a director change from 2026 replaces A where it was A and keeps the deliberate B', () => {
      const { versions } = applyChange(later(), 2026, { directorCarnet: 'C' });
      expect(versions.map((v) => v.directorCarnet)).toEqual(['C', 'B']);
    });

    it('where both versions hold the replaced value, both change (director reaches both)', () => {
      const same = [
        ver({ id: 1, from: 2026, to: 2028, directorCarnet: 'A' }),
        ver({ id: 2, from: 2028, name: 'Data & AI', directorCarnet: 'A' }),
      ];
      const { versions } = applyChange(same, 2026, { directorCarnet: 'C' });
      expect(versions.map((v) => v.directorCarnet)).toEqual(['C', 'C']);
      expect(versions.map((v) => v.name)).toEqual([
        'Data Science',
        'Data & AI',
      ]);
    });

    it('propagation is decided per field: a later version can follow one field and keep another', () => {
      const t = [
        ver({ id: 1, from: 2026, to: 2028, name: 'X', parentId: 10 }),
        ver({ id: 2, from: 2028, name: 'X', parentId: 99 }),
      ];
      const { versions } = applyChange(t, 2026, { name: 'Y', parentId: 11 });
      expect(versions.map((v) => [v.name, v.parentId])).toEqual([
        ['Y', 11],
        ['Y', 99],
      ]);
    });

    it('a split also propagates to versions after the new half', () => {
      const t = [
        ver({ id: 1, from: 2026, to: 2029, directorCarnet: 'A' }),
        ver({ id: 2, from: 2029, directorCarnet: 'A' }),
      ];
      const { versions } = applyChange(t, 2027, { directorCarnet: 'C' });
      expect(ranges(versions)).toEqual([
        [2026, 2027],
        [2027, 2029],
        [2029, null],
      ]);
      expect(versions.map((v) => v.directorCarnet)).toEqual(['A', 'C', 'C']);
    });
  });
});

describe('changedVersions', () => {
  it('splits the result into inserts (no id) and updates (id, something differs)', () => {
    const before = [ver({ id: 1 }), ver({ id: 2, from: 2030 })];
    const after = [
      ver({ id: 1, to: 2027 }),
      ver({ from: 2027, to: 2030, name: 'New' }),
      ver({ id: 2, from: 2030 }),
    ];
    const { inserts, updates } = changedVersions(before, after);
    expect(inserts.map((v) => v.name)).toEqual(['New']);
    expect(updates.map((v) => v.id)).toEqual([1]);
  });
});

describe('assertTimeline (I-1, I-2)', () => {
  const ok = [ver({ from: 2026, to: 2028 }), ver({ from: 2028 })];

  it('accepts a contiguous ordered timeline of an active entry', () => {
    expect(() => assertTimeline(ok, { ended: false })).not.toThrow();
  });

  it('accepts a bounded last version when the entry has ended', () => {
    expect(() =>
      assertTimeline([ver({ from: 2026, to: 2028 })], { ended: true }),
    ).not.toThrow();
  });

  it.each([
    ['empty', [], false],
    ['a gap', [ver({ from: 2026, to: 2027 }), ver({ from: 2028 })], false],
    ['an overlap', [ver({ from: 2026, to: 2029 }), ver({ from: 2028 })], false],
    [
      'two versions starting in one year',
      [ver({ from: 2026, to: 2027 }), ver({ from: 2026 })],
      false,
    ],
    [
      'out of order',
      [ver({ from: 2028 }), ver({ from: 2026, to: 2028 })],
      false,
    ],
    ['an empty range', [ver({ from: 2026, to: 2026 })], true],
    [
      'an open version in the middle',
      [ver({ from: 2026 }), ver({ from: 2028 })],
      false,
    ],
    ['an open last version on an ended entry', [ver({ from: 2026 })], true],
  ] as Array<[string, TimelineVersion[], boolean]>)(
    'rejects %s',
    (_label, versions, ended) => {
      expect(() => assertTimeline(versions, { ended })).toThrow(
        OrgTimelineInvariantError,
      );
    },
  );
});
