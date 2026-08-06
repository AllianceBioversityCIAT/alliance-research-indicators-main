import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  CapdevBulkNotificationRepository,
  mapCapdevBulkCountriesRow,
  mapCapdevBulkGroupRows,
  mapCapdevBulkMetricsRow,
} from './capdev-bulk-notification.repository';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { NotificationStatus } from './enum/notification-status.enum';
import { CapdevBulkGroupRawRow } from './dto/capdev-bulk-group.dto';

/**
 * Builds a chainable TypeORM QueryBuilder mock. Every chain method returns
 * the same object so `.innerJoin().leftJoin().where()...` compiles like the
 * real builder; only `getRawMany` resolves a value.
 */
function createMockQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  const chainMethods = [
    'innerJoin',
    'leftJoin',
    'where',
    'andWhere',
    'select',
    'addSelect',
    'groupBy',
  ];
  chainMethods.forEach((method) => {
    qb[method] = jest.fn().mockReturnValue(qb);
  });
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  return qb;
}

describe('CapdevBulkNotificationRepository', () => {
  let repository: CapdevBulkNotificationRepository;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder>;

  const mockEntityManager = { query: jest.fn(), createQueryBuilder: jest.fn() };
  const mockDataSource = {
    createEntityManager: jest.fn().mockReturnValue(mockEntityManager),
    getRepository: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockQueryBuilder = createMockQueryBuilder();
    mockDataSource.getRepository.mockReturnValue({
      createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapdevBulkNotificationRepository,
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    repository = module.get<CapdevBulkNotificationRepository>(
      CapdevBulkNotificationRepository,
    );
    repository.update = jest.fn().mockResolvedValue({ affected: 1 });
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  // ---------------------------------------------------------------------
  // Q1 — findGroups
  // ---------------------------------------------------------------------
  describe('findGroups', () => {
    const rowFor = (
      overrides: Partial<CapdevBulkGroupRawRow>,
    ): CapdevBulkGroupRawRow => ({
      agreement_id: 'AAA',
      project_lead_description: 'Fallback Lead',
      pi_carnet: 'PI-1',
      pi_first_name: 'Ada',
      pi_last_name: 'Lovelace',
      pi_email: 'ada@example.org',
      ra_carnet: null,
      ra_first_name: null,
      ra_last_name: null,
      ra_email: null,
      pa_carnet: null,
      pa_first_name: null,
      pa_last_name: null,
      pa_email: null,
      token_owner_id: 7,
      token_owner_first_name: 'Grace',
      token_owner_last_name: 'Hopper',
      token_owner_email: 'grace@example.org',
      multi_primary_result_ids: null,
      ...overrides,
    });

    it('BEHAVIORAL — collapses an N-result single-contract fixture (>=3 results) into exactly one group', async () => {
      // Three raw rows sharing the SAME agreement_id, simulating what Q1's
      // spine would return per bulk-upload row if SQL's GROUP BY were
      // absent/broken (3 CapDev results under one contract).
      mockQueryBuilder.getRawMany.mockResolvedValue([
        rowFor({}),
        rowFor({}),
        rowFor({}),
      ]);

      const result = await repository.findGroups(1);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].agreement_id).toBe('AAA');
      expect(result.groups[0].pi).toEqual({
        carnet: 'PI-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
        email: 'ada@example.org',
      });
    });

    it('BEHAVIORAL — a 3-contract batch returns exactly 3 groups', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        rowFor({ agreement_id: 'AAA' }),
        rowFor({ agreement_id: 'BBB' }),
        rowFor({ agreement_id: 'CCC' }),
      ]);

      const result = await repository.findGroups(1);

      expect(result.groups.map((g) => g.agreement_id).sort()).toEqual([
        'AAA',
        'BBB',
        'CCC',
      ]);
    });

    it('BEHAVIORAL — falls back to null person objects when a carnet is unresolvable', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        rowFor({ pi_carnet: null, pi_first_name: null }),
      ]);

      const result = await repository.findGroups(1);

      expect(result.groups[0].pi).toBeNull();
    });

    it('BEHAVIORAL — parses the multi-primary result_id list into warnings and logs one per result', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        rowFor({ multi_primary_result_ids: '501,502' }),
      ]);
      const warnSpy = jest.spyOn(
        (repository as unknown as { logger: { _warn: jest.Mock } }).logger,
        '_warn',
      );

      const result = await repository.findGroups(9);

      expect(result.multiPrimaryWarnings).toEqual([
        { result_id: 501, agreement_id: 'AAA' },
        { result_id: 502, agreement_id: 'AAA' },
      ]);
      expect(warnSpy).toHaveBeenCalledTimes(2);
      expect(warnSpy.mock.calls[0][0]).toContain('result_id=501');
      // Still one group despite the conflict — the ambiguous result must
      // not double-count the group.
      expect(result.groups).toHaveLength(1);
    });

    it('STRUCTURAL — asks for GROUP BY on the agreement-id expression', async () => {
      await repository.findGroups(1);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('ac.agreement_id');
    });

    it('STRUCTURAL — binds the CapDev filter from IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT, never a literal', async () => {
      await repository.findGroups(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'bur.indicator_id = :capdevIndicator',
        { capdevIndicator: IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT },
      );
      // Pin the concrete value so a future collision with the OpenSearch
      // rsult-type enum (same member name, value 5) is caught immediately.
      expect(IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT).toBe(1);
    });

    it('STRUCTURAL — excludes errored, null result_id, and (via the bound filter) non-CapDev rows', async () => {
      await repository.findGroups(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'bur.result_id IS NOT NULL',
      );
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'bur.error_message IS NULL',
      );
    });

    it('STRUCTURAL — the tie-break join picks the lowest result_contract_id among active primary contracts', async () => {
      await repository.findGroups(1);
      const [, , joinCondition] = mockQueryBuilder.innerJoin.mock.calls[0];
      expect(joinCondition).toContain('MIN(rc2.result_contract_id)');
      expect(joinCondition).toContain('rc2.is_primary = :isPrimary');
    });

    it('query count is O(groups): exactly one getRawMany call regardless of row count', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue(
        Array.from({ length: 50 }, (_, i) => rowFor({ agreement_id: `C-${i}` })),
      );

      await repository.findGroups(1);

      expect(mockDataSource.getRepository).toHaveBeenCalledTimes(1);
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------
  // mapCapdevBulkGroupRows — exported pure function, tested directly
  // ---------------------------------------------------------------------
  describe('mapCapdevBulkGroupRows (pure)', () => {
    const baseRow: CapdevBulkGroupRawRow = {
      agreement_id: 'AAA',
      project_lead_description: null,
      pi_carnet: 'PI-1',
      pi_first_name: 'Ada',
      pi_last_name: 'Lovelace',
      pi_email: 'ada@example.org',
      ra_carnet: null,
      ra_first_name: null,
      ra_last_name: null,
      ra_email: null,
      pa_carnet: null,
      pa_first_name: null,
      pa_last_name: null,
      pa_email: null,
      token_owner_id: null,
      token_owner_first_name: null,
      token_owner_last_name: null,
      token_owner_email: null,
      multi_primary_result_ids: null,
    };

    it('BEHAVIORAL (Disqualifies-clause fixture) — 3 raw rows for one contract collapse to 1 group', () => {
      const result = mapCapdevBulkGroupRows([baseRow, baseRow, baseRow]);
      expect(result.groups).toHaveLength(1);
    });

    it('BEHAVIORAL — 3 raw rows across 3 contracts map to 3 groups', () => {
      const result = mapCapdevBulkGroupRows([
        { ...baseRow, agreement_id: 'AAA' },
        { ...baseRow, agreement_id: 'BBB' },
        { ...baseRow, agreement_id: 'CCC' },
      ]);
      expect(result.groups).toHaveLength(3);
    });

    it('BEHAVIORAL — ignores rows without an agreement_id', () => {
      const result = mapCapdevBulkGroupRows([
        { ...baseRow, agreement_id: '' as unknown as string },
      ]);
      expect(result.groups).toHaveLength(0);
    });

    it('BEHAVIORAL — a null multi_primary_result_ids yields no warnings', () => {
      const result = mapCapdevBulkGroupRows([baseRow]);
      expect(result.multiPrimaryWarnings).toEqual([]);
    });

    it('BEHAVIORAL — an empty raw-row array yields no groups and no warnings', () => {
      const result = mapCapdevBulkGroupRows([]);
      expect(result).toEqual({ groups: [], multiPrimaryWarnings: [] });
    });

    it('BEHAVIORAL — maps the token owner from sec_users fields', () => {
      const result = mapCapdevBulkGroupRows([
        {
          ...baseRow,
          token_owner_id: 42,
          token_owner_first_name: 'Grace',
          token_owner_last_name: 'Hopper',
          token_owner_email: 'grace@example.org',
        },
      ]);
      expect(result.groups[0].token_owner).toEqual({
        sec_user_id: 42,
        first_name: 'Grace',
        last_name: 'Hopper',
        email: 'grace@example.org',
      });
    });

    it('BEHAVIORAL (mutation-tested — see repository report) — the Map-based collapse is what prevents N groups for one contract', () => {
      // This test is the one exercised red/green during the mutation-test
      // pass described in the implementer's report: breaking the Map dedup
      // (pushing every raw row into the output unconditionally) turns this
      // green assertion red with `groups.length === 3`.
      const result = mapCapdevBulkGroupRows([baseRow, baseRow, baseRow]);
      expect(result.groups).toHaveLength(1);
    });
  });

  // ---------------------------------------------------------------------
  // Q2 — findMetrics
  // ---------------------------------------------------------------------
  describe('findMetrics', () => {
    it('BEHAVIORAL — coerces numeric strings and parses dates via mapCapdevBulkMetricsRow', () => {
      const mapped = mapCapdevBulkMetricsRow({
        agreement_id: 'AAA',
        trainings_count: '12',
        participants_total: '1204',
        female_participants_total: '640',
        start_date: '2025-01-01T00:00:00.000Z',
        end_date: '2025-03-01T00:00:00.000Z',
      });

      expect(mapped).toEqual({
        agreement_id: 'AAA',
        trainings_count: 12,
        participants_total: 1204,
        female_participants_total: 640,
        start_date: new Date('2025-01-01T00:00:00.000Z'),
        end_date: new Date('2025-03-01T00:00:00.000Z'),
      });
    });

    it('BEHAVIORAL — null dates and null totals never produce NaN, only 0 / null', () => {
      const mapped = mapCapdevBulkMetricsRow({
        agreement_id: 'AAA',
        trainings_count: '3',
        participants_total: null,
        female_participants_total: null,
        start_date: null,
        end_date: null,
      });

      expect(mapped.participants_total).toBe(0);
      expect(mapped.female_participants_total).toBe(0);
      expect(mapped.start_date).toBeNull();
      expect(mapped.end_date).toBeNull();
      expect(Number.isNaN(mapped.participants_total)).toBe(false);
    });

    it('STRUCTURAL — the participants formula falls back to male+female+non_binary when the total is null', async () => {
      await repository.findMetrics(1);
      const participantsCall = mockQueryBuilder.addSelect.mock.calls.find(
        ([, alias]) => alias === 'participants_total',
      );
      expect(participantsCall?.[0]).toContain(
        'COALESCE(rcs.session_participants_total,',
      );
      expect(participantsCall?.[0]).toContain(
        'session_participants_male',
      );
    });

    it('STRUCTURAL — groups by agreement_id', async () => {
      await repository.findMetrics(1);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('ac.agreement_id');
    });

    it('query count is O(groups): exactly one getRawMany call', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          agreement_id: `C-${i}`,
          trainings_count: '1',
          participants_total: '0',
          female_participants_total: '0',
          start_date: null,
          end_date: null,
        })),
      );
      await repository.findMetrics(1);
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------
  // Q3 — findCountries
  // ---------------------------------------------------------------------
  describe('findCountries', () => {
    it('BEHAVIORAL — mapCapdevBulkCountriesRow splits both GROUP_CONCAT columns independently', () => {
      const mapped = mapCapdevBulkCountriesRow({
        agreement_id: 'AAA',
        country_names: 'Kenya,Uganda',
        iso_alpha2_list: 'KE,UG',
      });
      expect(mapped.country_names).toEqual(['Kenya', 'Uganda']);
      expect(mapped.iso_alpha2_list).toEqual(['KE', 'UG']);
    });

    it('BEHAVIORAL — null GROUP_CONCAT columns map to empty arrays, never null/undefined entries', () => {
      const mapped = mapCapdevBulkCountriesRow({
        agreement_id: 'AAA',
        country_names: null,
        iso_alpha2_list: null,
      });
      expect(mapped.country_names).toEqual([]);
      expect(mapped.iso_alpha2_list).toEqual([]);
    });

    it('STRUCTURAL — selects the name list and the isoAlpha2 list as two distinct columns', async () => {
      await repository.findCountries(1);
      const aliases = mockQueryBuilder.addSelect.mock.calls.map(
        ([, alias]) => alias,
      );
      expect(aliases).toContain('country_names');
      expect(aliases).toContain('iso_alpha2_list');
    });

    it('STRUCTURAL — groups by agreement_id', async () => {
      await repository.findCountries(1);
      expect(mockQueryBuilder.groupBy).toHaveBeenCalledWith('ac.agreement_id');
    });
  });

  // ---------------------------------------------------------------------
  // Q4 — findUnattributedResultIds
  // ---------------------------------------------------------------------
  describe('findUnattributedResultIds', () => {
    it('BEHAVIORAL — returns the result_id list, not a count', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue([
        { result_id: '501' },
        { result_id: '502' },
      ]);

      const result = await repository.findUnattributedResultIds(1);

      expect(result).toEqual([501, 502]);
    });

    it('STRUCTURAL — selects bur.result_id under the "result_id" alias, never COUNT(*)', async () => {
      await repository.findUnattributedResultIds(1);
      expect(mockQueryBuilder.select).toHaveBeenCalledWith(
        'bur.result_id',
        'result_id',
      );
      expect(mockQueryBuilder.select).not.toHaveBeenCalledWith(
        expect.stringContaining('COUNT'),
        expect.anything(),
      );
    });

    it('STRUCTURAL — filters to rows with no matched active primary contract', async () => {
      await repository.findUnattributedResultIds(1);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'rc.result_contract_id IS NULL',
      );
    });

    it('query count is O(1): exactly one getRawMany call regardless of batch size', async () => {
      mockQueryBuilder.getRawMany.mockResolvedValue(
        Array.from({ length: 30 }, (_, i) => ({ result_id: String(i) })),
      );
      await repository.findUnattributedResultIds(1);
      expect(mockQueryBuilder.getRawMany).toHaveBeenCalledTimes(1);
    });
  });

  // ---------------------------------------------------------------------
  // Writes
  // ---------------------------------------------------------------------
  describe('persistProcessMetrics', () => {
    it('updates the process row with the given aggregate values', async () => {
      const metrics = {
        total_results: 12,
        total_capdev_results: 12,
        total_participants: 1204,
        total_female_participants: 640,
        activity_start_date: new Date('2025-01-01'),
        activity_end_date: new Date('2025-03-01'),
        countries: ['KE', 'UG'],
      };

      await repository.persistProcessMetrics(9, metrics);

      expect(repository.update).toHaveBeenCalledWith(9, metrics);
    });
  });

  describe('updateNotificationStatus', () => {
    it('writes both notification_status and notification_sent_at', async () => {
      const sentAt = new Date('2025-01-01T00:00:00.000Z');

      await repository.updateNotificationStatus(
        9,
        NotificationStatus.SENT,
        sentAt,
      );

      expect(repository.update).toHaveBeenCalledWith(9, {
        notification_status: NotificationStatus.SENT,
        notification_sent_at: sentAt,
      });
    });

    it('writes a null sent_at for SKIPPED', async () => {
      await repository.updateNotificationStatus(
        9,
        NotificationStatus.SKIPPED,
        null,
      );

      expect(repository.update).toHaveBeenCalledWith(9, {
        notification_status: NotificationStatus.SKIPPED,
        notification_sent_at: null,
      });
    });
  });
});
