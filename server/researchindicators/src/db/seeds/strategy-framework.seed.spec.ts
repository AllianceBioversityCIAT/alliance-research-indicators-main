import { QueryRunner } from 'typeorm';
import { LoggerUtil } from '../../domain/shared/utils/logger.util';
import {
  SEED_ELEMENTS,
  SEED_LEVELS,
  SEED_LINKS,
  SEED_OBJECTIVES,
  SEED_RESPONSIBLES,
} from './seed-data/strategy-framework.data';
import {
  ResponsibleMatchReason,
  StaffCandidate,
  matchResponsibleCandidate,
  seedStrategyFramework,
} from './strategy-framework.seed';

/**
 * Unit spec for the seed function (R-STF-011 AC.2 and AC.3, design 3.4).
 *
 * CANNOT PROVE (KZ-017): a mock query runner reports the affectedRows the
 * test handed it. It does not show that MySQL inserted those rows, nor that
 * a second call on a real table changes 0 rows. That reading is the scratch
 * up / seed / down run.
 */

const person = (
  carnet: string,
  first: string,
  last: string,
  email: string | null,
  active = 1,
): StaffCandidate => ({
  carnet,
  first_name: first,
  last_name: last,
  email,
  is_active: active,
});

const candidate = (
  name: string,
  email: string | null,
): (typeof SEED_RESPONSIBLES)[number] => ({
  elementCode: '1.1.1',
  name,
  email,
  position: 1,
});

describe('matchResponsibleCandidate', () => {
  it('stores the single active email hit and does not fall through an ambiguous email', () => {
    const staff = [
      person('1', 'Ana', 'Lopez', 'shared@cgiar.org'),
      person('2', 'Bea', 'Costa', 'shared@cgiar.org'),
    ];
    expect(
      matchResponsibleCandidate(
        staff,
        candidate('Ana Lopez', 'shared@cgiar.org'),
      ),
    ).toEqual({ reason: 'ambiguous', carnet: null, detail: 'email' });

    expect(
      matchResponsibleCandidate(
        [person('9', 'Idris', 'Jones', 'I.Jones@CGIAR.ORG')],
        candidate('Someone Else', 'i.jones@cgiar.org'),
      ),
    ).toEqual({ reason: 'matched', carnet: '9', detail: null });
  });

  it('uses the exact trimmed full name when the email misses, and names the miss', () => {
    const staff = [person('4', 'Philippe', 'Attey', 'other@cgiar.org')];
    expect(
      matchResponsibleCandidate(
        staff,
        candidate('Philippe Attey', 'no@cgiar.org'),
      ),
    ).toEqual({ reason: 'matched', carnet: '4', detail: null });

    expect(
      matchResponsibleCandidate(
        staff,
        candidate('Nobody Here', 'no@cgiar.org'),
      ),
    ).toEqual({
      reason: 'no email hit; no exact name hit',
      carnet: null,
      detail: null,
    });

    expect(
      matchResponsibleCandidate(staff, candidate('Nobody Here', null)),
    ).toEqual({ reason: 'no exact name hit', carnet: null, detail: null });

    expect(
      matchResponsibleCandidate(
        [person('5', 'Philippe', 'Attey', null, 0)],
        candidate('Philippe Attey', null),
      ),
    ).toEqual({
      reason: 'no exact name hit',
      carnet: null,
      detail: 'inactive staff only',
    });
  });

  it('treats two active names as ambiguous', () => {
    const staff = [
      person('1', 'Ana', 'Lopez', null),
      person('2', 'Ana', 'Lopez', 'a@cgiar.org'),
    ];
    const match = matchResponsibleCandidate(
      staff,
      candidate('Ana Lopez', null),
    );
    expect(match.reason).toBe<ResponsibleMatchReason>('ambiguous');
    expect(match.detail).toBe('name');
    expect(match.carnet).toBeNull();
  });
});

describe('seedStrategyFramework', () => {
  const structural =
    SEED_LEVELS.length +
    SEED_ELEMENTS.length +
    SEED_OBJECTIVES.length +
    SEED_LINKS.length;

  beforeEach(() => {
    jest
      .spyOn(LoggerUtil.prototype, '_warn')
      .mockImplementation(() => undefined);
    jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  function runnerReturning(
    staff: StaffCandidate[],
    affected: number,
  ): { runner: QueryRunner; calls: { sql: string; params: unknown[] }[] } {
    const calls: { sql: string; params: unknown[] }[] = [];
    const runner = {
      query: jest.fn(async (sql: string, params?: unknown[]) => {
        calls.push({ sql, params: params ?? [] });
        if (sql.includes('alliance_user_staff')) {
          return staff;
        }
        return { affectedRows: affected };
      }),
    } as unknown as QueryRunner;
    return { runner, calls };
  }

  it('returns the sum of affectedRows and logs each unmatched candidate', async () => {
    const { runner } = runnerReturning([], 1);
    const warn = jest.spyOn(LoggerUtil.prototype, '_warn');

    await expect(seedStrategyFramework(runner)).resolves.toBe(structural);

    expect(warn).toHaveBeenCalledTimes(SEED_RESPONSIBLES.length);
    for (const call of warn.mock.calls) {
      expect(String(call[0])).toMatch(
        /no email hit|no exact name hit|ambiguous/,
      );
    }
  });

  it('returns 0 when every insert reports 0 affected rows', async () => {
    const { runner } = runnerReturning([], 0);
    await expect(seedStrategyFramework(runner)).resolves.toBe(0);
  });

  it('adds one affected row per email match and binds the carnet', async () => {
    const email = SEED_RESPONSIBLES[0].email ?? '';
    const expected = SEED_RESPONSIBLES.filter(
      (item) => item.email?.trim().toLowerCase() === email.trim().toLowerCase(),
    ).length;
    const { runner, calls } = runnerReturning(
      [person('CARNET1', 'Different', 'Person', email)],
      1,
    );

    await expect(seedStrategyFramework(runner)).resolves.toBe(
      structural + expected,
    );

    const responsibleInserts = calls.filter((call) =>
      call.sql.includes('INSERT INTO `framework_element_responsibles`'),
    );
    expect(responsibleInserts).toHaveLength(expected);
    expect(
      responsibleInserts.every((call) => call.params.includes('CARNET1')),
    ).toBe(true);
    for (const call of calls) {
      const marks = call.sql.match(/\?/g) ?? [];
      expect(marks).toHaveLength(call.params.length);
      const bare = call.sql.replace(/`[^`]*`/g, '``');
      expect(bare).not.toMatch(/:(?:\d+|[a-zA-Z][a-zA-Z0-9_]*)/);
      expect(bare).not.toMatch(/--|\*\//);
    }
  });
});
