import {
  applyChange,
  assertTimeline,
  changedVersions,
  findCovering,
  findDirectorDelegateOverlap,
  OrgTimelineInvariantError,
  sameCarnets,
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
  delegates: [],
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

/**
 * Delegates as a versioned field (R-ORG-017, D-ORG-24). Every fixture gives
 * DIFFERENT lists to different versions, so "kept" and "overwritten" give
 * different answers (disqualifier: a fixture with the same list everywhere
 * cannot tell them apart).
 */
describe('delegates as a versioned field (D-ORG-24)', () => {
  const delegatesOf = (versions: TimelineVersion[]) =>
    versions.map((v) => v.delegates);

  it('split: the old half keeps its list, the new half takes the new one, and they share no array', () => {
    const result = applyChange([ver({ id: 1, delegates: ['B1'] })], 2027, {
      delegates: ['B1', 'B2'],
    });
    expect(result.kind).toBe('new_version');
    expect(ranges(result.versions)).toEqual([
      [2026, 2027],
      [2027, null],
    ]);
    expect(delegatesOf(result.versions)).toEqual([['B1'], ['B1', 'B2']]);
    expect(result.diff).toEqual({
      delegates: { old: ['B1'], new: ['B1', 'B2'] },
    });
    result.versions[0].delegates.push('MUTATED');
    expect(result.versions[1].delegates).toEqual(['B1', 'B2']);
    assertTimeline(result.versions, { ended: false });
  });

  it('in place: a delegates-only change in the start year edits that version', () => {
    const result = applyChange([ver({ id: 1 })], 2026, { delegates: ['B1'] });
    expect(result.kind).toBe('edit_in_place');
    expect(result.versions[0]).toMatchObject({ id: 1, delegates: ['B1'] });
  });

  it('a later deliberate list is kept: [B3] in [2028, open) survives a change of B1 to B2 from 2026', () => {
    const t = [
      ver({ id: 1, from: 2026, to: 2028, delegates: ['B1'] }),
      ver({ id: 2, from: 2028, delegates: ['B3'] }),
    ];
    const { versions } = applyChange(t, 2026, { delegates: ['B2'] });
    expect(delegatesOf(versions)).toEqual([['B2'], ['B3']]);
  });

  it('a later version that holds the same list takes the new one too', () => {
    const t = [
      ver({ id: 1, from: 2026, to: 2028, delegates: ['B1'] }),
      ver({ id: 2, from: 2028, delegates: ['B1'] }),
    ];
    const { versions } = applyChange(t, 2026, { delegates: ['B2'] });
    expect(delegatesOf(versions)).toEqual([['B2'], ['B2']]);
    expect(versions[0].delegates).not.toBe(versions[1].delegates);
  });

  it('compares lists as SETS: [B1, B2] equals [B2, B1] (propagates), [B1] differs from [B1, B2] (kept)', () => {
    const reordered = [
      ver({ id: 1, from: 2026, to: 2028, delegates: ['B1', 'B2'] }),
      ver({ id: 2, from: 2028, delegates: ['B2', 'B1'] }),
    ];
    expect(
      delegatesOf(applyChange(reordered, 2026, { delegates: ['B9'] }).versions),
    ).toEqual([['B9'], ['B9']]);

    const subset = [
      ver({ id: 1, from: 2026, to: 2028, delegates: ['B1', 'B2'] }),
      ver({ id: 2, from: 2028, delegates: ['B1'] }),
    ];
    expect(
      delegatesOf(applyChange(subset, 2026, { delegates: ['B9'] }).versions),
    ).toEqual([['B9'], ['B1']]);
  });

  it('sending the same set in another order is a no-op', () => {
    const result = applyChange(
      [ver({ id: 1, delegates: ['B1', 'B2'] })],
      2027,
      { delegates: ['b2', 'B1'] },
    );
    expect(result.kind).toBe('none');
  });

  it('sameCarnets ignores order and case but not membership', () => {
    expect(sameCarnets(['A', 'b'], ['B', 'a'])).toBe(true);
    expect(sameCarnets(['A'], ['A', 'B'])).toBe(false);
    expect(sameCarnets([], [])).toBe(true);
  });

  it('changedVersions flags a version whose list changed as a set, not one that was only reordered', () => {
    const before = [ver({ id: 1, delegates: ['B1', 'B2'] })];
    expect(
      changedVersions(before, [ver({ id: 1, delegates: ['B2', 'B1'] })])
        .updates,
    ).toEqual([]);
    expect(
      changedVersions(before, [ver({ id: 1, delegates: ['B1'] })]).updates,
    ).toHaveLength(1);
  });

  describe('I-6 per version (findDirectorDelegateOverlap)', () => {
    // Director A in [2026, 2028) and C in [2028, open); no delegates.
    const stored = () => [
      ver({ id: 1, from: 2026, to: 2028, directorCarnet: 'A' }),
      ver({ id: 2, from: 2028, directorCarnet: 'C' }),
    ];
    const check = (
      year: number,
      changes: Parameters<typeof applyChange>[2],
    ) => {
      const before = stored();
      return findDirectorDelegateOverlap(
        before,
        applyChange(before, year, changes).versions,
        year,
      );
    };

    it('allows the director of ANOTHER version as a delegate (A from 2028)', () => {
      expect(check(2028, { delegates: ['A'] })).toBeNull();
    });

    it('rejects A from 2026, naming delegates, in the version from 2026', () => {
      expect(check(2026, { delegates: ['A'] })).toEqual({
        from: 2026,
        carnet: 'A',
        field: 'delegates',
      });
    });

    it('finds an overlap that exists ONLY in a propagated later version (not visible at Y)', () => {
      // 2028 version: director C, delegates [] (equals the replaced list), so
      // the new list [C] propagates there; at Y = 2026 director A is not in [C].
      expect(check(2026, { delegates: ['C'] })).toEqual({
        from: 2028,
        carnet: 'C',
        field: 'delegates',
      });
    });

    it('a delegate made director names director (in place and through propagation)', () => {
      const before = [
        ver({ id: 1, from: 2026, to: 2027, directorCarnet: 'A' }),
        ver({ id: 2, from: 2027, directorCarnet: 'A', delegates: ['B'] }),
      ];
      for (const year of [2027, 2026]) {
        const after = applyChange(before, year, { directorCarnet: 'B' });
        expect(
          findDirectorDelegateOverlap(before, after.versions, year),
        ).toEqual({ from: 2027, carnet: 'B', field: 'director' });
      }
    });

    it('moving the director away from X while adding X as delegate is accepted', () => {
      const before = [ver({ id: 1, directorCarnet: 'X' })];
      const after = applyChange(before, 2026, {
        directorCarnet: 'Y',
        delegates: ['X'],
      });
      expect(
        findDirectorDelegateOverlap(before, after.versions, 2026),
      ).toBeNull();
    });

    it('names director when the same version changes both fields into an overlap', () => {
      const before = [ver({ id: 1, directorCarnet: 'X' })];
      const after = applyChange(before, 2026, {
        directorCarnet: 'Y',
        delegates: ['Y'],
      });
      expect(findDirectorDelegateOverlap(before, after.versions, 2026)).toEqual(
        { from: 2026, carnet: 'Y', field: 'director' },
      );
    });

    it('on create (no stored versions) names delegates', () => {
      expect(
        findDirectorDelegateOverlap(
          [],
          [ver({ directorCarnet: 'A', delegates: ['a'] })],
          2026,
        ),
      ).toEqual({ from: 2026, carnet: 'a', field: 'delegates' });
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
