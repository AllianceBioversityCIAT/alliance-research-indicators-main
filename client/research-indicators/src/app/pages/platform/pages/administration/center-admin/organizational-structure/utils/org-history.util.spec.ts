import { OrgChangeLogRow, OrgUnitVersionView } from '@shared/interfaces/org-structure.interface';
import { ORG_ACTION_LABELS, actorLabel, diffLines, formatDiffValue, formatLogTime, versionRows, versionYears } from './org-history.util';

// @akili-spec institutional-performance/organizational-structure T-03 (client half) — design §6.6;
// requirements R-ORG-009, R-ORG-017 (a delegates change shows both lists).

const version = (o: Partial<OrgUnitVersionView>): OrgUnitVersionView => ({
  from: 2026,
  to: null,
  name: 'Unit',
  acronym: null,
  levelId: 23,
  levelCode: 'L4',
  parentId: null,
  parentCode: null,
  parentName: null,
  director: null,
  ...o
});

describe('org-history.util', () => {
  it('`to` is exclusive: [2026, 2028) reads 2026–2027, [2026, 2027) reads 2026, open reads onwards', () => {
    expect(versionYears(2026, 2028)).toBe('2026–2027');
    expect(versionYears(2026, 2027)).toBe('2026');
    expect(versionYears(2028, null)).toBe('2028 onwards');
  });

  it('builds version rows with level, parent and director text', () => {
    const rows = versionRows([
      version({
        from: 2026,
        to: 2028,
        parentId: 2,
        parentCode: 'ORG-2',
        parentName: 'Dept',
        director: { carnet: 'A1', name: 'Ana', email: null, isActiveStaff: true }
      }),
      version({ from: 2028, name: 'Renamed' })
    ]);

    // Adapted (T-12): rows gained a `delegates` text (dash when a version holds none).
    expect(rows[0]).toEqual({ years: '2026–2027', name: 'Unit', level: 'L4 Unit', parent: 'ORG-2 Dept', director: 'Ana', delegates: '—' });
    expect(rows[1]).toEqual({ years: '2028 onwards', name: 'Renamed', level: 'L4 Unit', parent: '—', director: '—', delegates: '—' });
  });

  it("shows each version's own delegates, names joined, carnet when a name is missing (D-ORG-24)", () => {
    const rows = versionRows([
      version({ from: 2026, to: 2027, delegates: [{ carnet: 'B1', name: 'Beto', email: null, isActiveStaff: true }] }),
      version({
        from: 2027,
        delegates: [
          { carnet: 'B2', name: 'Cira', email: null, isActiveStaff: true },
          { carnet: 'B3', name: null, email: null, isActiveStaff: false }
        ]
      })
    ]);

    expect(rows.map(r => r.delegates)).toEqual(['Beto', 'Cira; B3']);
  });

  it('a delegates diff on a version action renders old and new names; a legacy delegates_change row keeps its label', () => {
    const names = new Map([
      ['B1', 'Beto'],
      ['B2', 'Cira']
    ]);
    const versioned: OrgChangeLogRow = {
      id: 5,
      unitId: 7,
      action: 'new_version',
      appliesFromYear: 2027,
      backdated: false,
      createdAt: '2026-10-22T08:30:00.000Z',
      createdBy: { id: 3, name: 'Admin', email: null },
      changes: { delegates: { old: ['B1'], new: ['B1', 'B2'] } }
    };

    expect(ORG_ACTION_LABELS[versioned.action]).toBe('New version');
    expect(diffLines(versioned, names)).toEqual([{ field: 'delegates', label: 'Delegates', before: 'Beto', after: 'Beto, Cira' }]);
    expect(ORG_ACTION_LABELS['delegates_change']).toBe('Delegates changed');
  });

  it('formats diff values: lists of staff by name, empty and null as a dash', () => {
    expect(formatDiffValue(null)).toBe('—');
    expect(formatDiffValue([])).toBe('—');
    expect(formatDiffValue(['B2001', 'B2002'])).toBe('B2001, B2002');
    expect(formatDiffValue([{ carnet: 'B2001', name: 'Luis Gomez' }, { carnet: 'B2002' }])).toBe('Luis Gomez, B2002');
    expect(formatDiffValue(2027)).toBe('2027');
  });

  const base: OrgChangeLogRow = {
    id: 1,
    unitId: 7,
    action: 'delegates_change',
    appliesFromYear: null,
    backdated: false,
    createdAt: '2026-10-19T08:30:00.000Z',
    createdBy: { id: 3, name: 'Admin', email: 'a@example.org' },
    changes: { delegates: { old: ['B2001'], new: ['B2002'] } }
  };

  it('turns a delegates change into one line holding the old and the new list (carnets, or names when known)', () => {
    expect(diffLines(base)).toEqual([{ field: 'delegates', label: 'Delegates', before: 'B2001', after: 'B2002' }]);
    expect(diffLines(base, new Map([['B2002', 'Marta Ruiz']]))[0]).toEqual(expect.objectContaining({ before: 'B2001', after: 'Marta Ruiz' }));
    expect(diffLines({ ...base, changes: {} })).toEqual([]);
  });

  it('labels the lifecycle fields and renders an object value readably, never as [object Object]', () => {
    const lines = diffLines({
      ...base,
      action: 'reactivate',
      changes: {
        status: { old: 'inactive', new: 'active' },
        lastVersionEnd: { old: null, new: 2027 },
        droppedVersions: { old: null, new: [{ from: 2027, to: null, name: 'Scheduled' }] },
        newVersion: { old: null, new: { from: 2028, name: 'Unit Five' } }
      }
    });

    expect(lines.map(l => l.label)).toEqual(['Status', 'Last version ends', 'Dropped versions', 'New version']);
    expect(lines[1].after).toBe('2027');
    expect(lines[2].after).toBe('from: 2027, to: —, name: Scheduled');
    expect(lines[3].after).toBe('from: 2028, name: Unit Five');
    expect(lines.some(l => l.after.includes('[object Object]'))).toBe(false);
  });

  it('a physical delete shows each last value against a dash', () => {
    const [line] = diffLines({ ...base, action: 'delete_physical', changes: { name: { old: 'Unit Five', new: null } } });

    expect(line).toEqual({ field: 'name', label: 'Name', before: 'Unit Five', after: '—' });
  });

  it('names the actor: name, else email, else User #id, else a neutral label', () => {
    expect(actorLabel({ id: 3, name: 'Admin', email: 'a@example.org' })).toBe('Admin');
    expect(actorLabel({ id: 3, name: null, email: 'a@example.org' })).toBe('a@example.org');
    expect(actorLabel({ id: 3, name: null, email: null })).toBe('User #3');
    expect(actorLabel({ id: null, name: null, email: null })).toBe('Unknown user');
  });

  it('formats the log time in UTC and shows an unparseable value as received', () => {
    expect(formatLogTime('2026-10-19T08:30:00.000Z')).toBe('2026-10-19 08:30 UTC');
    expect(formatLogTime('not a date')).toBe('not a date');
  });
});
