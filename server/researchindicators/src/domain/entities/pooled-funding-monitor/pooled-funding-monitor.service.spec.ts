import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PfmScopeEnum } from './enum/pfm-scope.enum';
import { PfmChipEnum } from './enum/pfm-chip.enum';
import { PooledFundingMonitorService } from './pooled-funding-monitor.service';
import {
  PfmMonitoredRow,
  PooledFundingMonitorRepository,
} from './repositories/pooled-funding-monitor.repository';

// @akili-spec docs/specs/bilateral/prms-sync/pooled-funding-monitor — T-05
// Orchestration only (scope hand-off, 404 rule, error mapping, response shape).
// What the SQL returns is asserted on real rows in the integration spec / e2e.

const row = (o: Partial<PfmMonitoredRow> = {}): PfmMonitoredRow =>
  ({
    result_id: 1,
    result_official_code: 1001,
    report_year: 2026,
    platform_code: 'STAR',
    title: 'T',
    indicator_id: 1,
    indicator_name: 'Knowledge Product',
    result_status_id: 6,
    result_status_name: 'Approved',
    updated_at: new Date('2026-10-01T10:20:00Z'),
    approved_at: new Date('2026-03-05T10:00:00Z'),
    project_code: 'P-A',
    project_name: 'Project A',
    donor: 'D',
    lead_pi: 'Lead',
    snapshot_years: [2025],
    has_alignment: true,
    has_contribution: true,
    mapping_complete: true,
    is_synced_to_prms: false,
    primary_sp: { code: 'SP01', name: 'Alpha', color: '#111', category: null },
    contributing_sps: [],
    contributing_sp_names: [],
    prms_history_status: null,
    prms_justification: null,
    creator: 'Ana Perez',
    ...o,
  }) as PfmMonitoredRow;

describe('PooledFundingMonitorService', () => {
  let repo: jest.Mocked<PooledFundingMonitorRepository>;
  let service: PooledFundingMonitorService;

  beforeEach(() => {
    repo = {
      findMonitoredResults: jest.fn().mockResolvedValue([
        row(),
        row({
          result_id: 2,
          result_official_code: 1002,
          result_status_id: 4,
          result_status_name: 'Draft',
          approved_at: null,
          project_code: 'P-B',
          updated_at: null,
        }),
      ]),
      countContributingProjects: jest.fn().mockResolvedValue(9),
      findMonthlySyncs: jest.fn().mockResolvedValue([]),
      countSyncedThisYear: jest.fn().mockResolvedValue(4),
      isPiOfAnyContributingProject: jest.fn().mockResolvedValue(true),
      findFilterOptions: jest.fn().mockResolvedValue({
        projects: [],
        science_programs: [],
        types: [],
      }),
    } as unknown as jest.Mocked<PooledFundingMonitorRepository>;
    service = new PooledFundingMonitorService(repo);
  });

  describe('scope resolution (NFR-PFM-001)', () => {
    it('defaults to mine and hands the AUTHENTICATED user id to every scoped read', async () => {
      const summary = await service.getSummary(77);
      expect(summary.scope).toBe(PfmScopeEnum.MINE);
      const mine = { scope: PfmScopeEnum.MINE, userId: 77 };
      expect(repo.findMonitoredResults).toHaveBeenCalledWith(mine);
      expect(repo.findMonthlySyncs).toHaveBeenCalledWith(
        mine,
        expect.any(Date),
      );
      expect(repo.countSyncedThisYear).toHaveBeenCalledWith(
        mine,
        expect.any(Date),
      );
      expect(repo.isPiOfAnyContributingProject).toHaveBeenCalledWith(77);
    });

    it('scope=all uses the portfolio and still reports is_pi_of_any for the user', async () => {
      repo.isPiOfAnyContributingProject.mockResolvedValue(false);
      const summary = await service.getSummary(77, PfmScopeEnum.ALL);
      expect(repo.findMonitoredResults).toHaveBeenCalledWith({
        scope: PfmScopeEnum.ALL,
      });
      expect(summary.is_pi_of_any).toBe(false);
      expect(summary.synced_this_year).toBe(4);
      expect(summary.kpis.projects_total).toBe(9);
    });

    it.each([undefined, null, NaN, '7' as unknown as number])(
      'maps a non-integer user id (%p) to 403, never a raw Error, never the portfolio',
      async (userId) => {
        await expect(service.getSummary(userId)).rejects.toBeInstanceOf(
          ForbiddenException,
        );
        await expect(
          service.getQueue(userId, { scope: PfmScopeEnum.MINE }),
        ).rejects.toBeInstanceOf(ForbiddenException);
        expect(repo.findMonitoredResults).not.toHaveBeenCalled();
      },
    );
  });

  it('summary KPIs come from one derivation of the scope rows', async () => {
    const s = await service.getSummary(1, PfmScopeEnum.ALL);
    expect(s.kpis.monitored).toBe(2);
    expect(s.kpis.projects).toBe(2);
    expect(s.pipeline.total).toBe(2);
  });

  describe('queue', () => {
    it('adds filter_options from the repository and applies the chip after counting', async () => {
      const q = await service.getQueue(1, {
        scope: PfmScopeEnum.ALL,
        chip: PfmChipEnum.READY_TO_SYNC,
      });
      expect(q.filter_options).toEqual({
        projects: [],
        science_programs: [],
        types: [],
      });
      expect(q.chip_counts.all).toBe(2);
      expect(q.totals).toEqual({ results: 1, projects: 1, monitored_total: 2 });
      expect(q.groups.map((g) => g.code)).toEqual(['P-A']);
    });

    it('filters combine with AND', async () => {
      const q = await service.getQueue(1, {
        scope: PfmScopeEnum.ALL,
        project: 'P-A',
        type: 2,
      });
      expect(q.totals.results).toBe(0);
    });
  });

  describe('project results', () => {
    it('404s for a project that is not in the viewer scope, whether or not it exists', async () => {
      await expect(
        service.getProjectResults(1, 'P-NOPE', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns design §4 fields, with a null updated_at formatted as an em dash', async () => {
      const [r] = await service.getProjectResults(1, 'P-B', {
        scope: PfmScopeEnum.ALL,
      });
      expect(r).toEqual({
        result_code: 'STAR-1002',
        platform_code: 'STAR',
        official_code: 1002,
        report_year: 2026,
        snapshot_years: [2025],
        title: 'T',
        type: 'Knowledge Product',
        creator: 'Ana Perez',
        star_label: 'Draft',
        star_status_id: 4,
        pi_line: expect.any(String),
        mapping_state: 'Complete',
        mapping_note: expect.any(String),
        sp_line: expect.any(String),
        primary_sp: { code: 'SP01', name: 'Alpha', color: '#111' },
        contributing: [],
        prms_status: 'Not sent',
        prms_hint: expect.any(String),
        updated_at: '—',
        star_status_name: null,
        star_status_config: null,
      });
    });

    it('passes the STAR status name through for the displayed tag text', async () => {
      repo.findMonitoredResults.mockResolvedValue([
        row({ star_status_name: 'Rejected' }),
      ]);
      const [r] = await service.getProjectResults(1, 'P-A', {
        scope: PfmScopeEnum.ALL,
      });
      expect(r.star_status_name).toBe('Rejected');
    });

    it('passes the STAR status config through so the client can colour the tag like the Results Center', async () => {
      const config = { color: { border: 'b', text: 't', background: 'g' } };
      repo.findMonitoredResults.mockResolvedValue([
        row({ star_status_config: config }),
      ]);
      const [r] = await service.getProjectResults(1, 'P-A', {
        scope: PfmScopeEnum.ALL,
      });
      expect(r.star_status_config).toEqual(config);
    });

    it('200 with an empty list when the project is in scope but filters exclude its rows', async () => {
      const out = await service.getProjectResults(1, 'P-A', {
        chip: PfmChipEnum.SYNCED,
      });
      expect(out).toEqual([]);
    });
  });
});
