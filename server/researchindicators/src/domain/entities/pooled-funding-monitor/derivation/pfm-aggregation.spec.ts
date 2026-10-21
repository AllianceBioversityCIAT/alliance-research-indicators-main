import { PfmChipEnum } from '../enum/pfm-chip.enum';
import { PfmScopeEnum } from '../enum/pfm-scope.enum';
import {
  PfmMonitoredRow,
  PfmSpRef,
} from '../repositories/pooled-funding-monitor.repository';
import {
  assignPfmStage,
  buildMonthlySeries,
  buildPfmGroups,
  buildPfmPipeline,
  buildPfmQueue,
  buildPfmSummary,
  buildProjectProgress,
  buildRejectionReasons,
  buildSpCoverage,
  deriveMonitoredRows,
  PFM_CHIP_COUNT_KEYS,
  PFM_NO_REASON,
  PfmStageKeyEnum,
  pfmAttentionFlag,
  rankPfmRows,
} from './pfm-aggregation';
import { derivePfmRow } from './pfm-derivation';

const sp = (code: string): PfmSpRef => ({
  code,
  name: `Program ${code}`,
  color: null,
  category: null,
});

/** Approved, mapping Complete, not synced, SP01, indicator 1 unless overridden. */
const mk = (
  id: number,
  project: string,
  o: Partial<PfmMonitoredRow> = {},
): PfmMonitoredRow => ({
  result_id: id,
  result_official_code: id,
  report_year: 2026,
  platform_code: 'STAR',
  title: `R${id}`,
  indicator_id: 1,
  indicator_name: 'Policy change',
  project_code: project,
  project_name: `Project ${project}`,
  donor: `Donor ${project}`,
  lead_pi: `PI ${project}`,
  snapshot_years: [2026],
  result_status_id: 6,
  result_status_name: 'Approved',
  star_status_name: null,
  star_status_description: null,
  star_status_config: null,
  approved_at: new Date('2026-03-05T10:00:00Z'),
  has_alignment: true,
  has_contribution: true,
  mapping_complete: true,
  primary_sp: sp('SP01'),
  contributing_sp_names: [],
  contributing_sps: [],
  is_synced_to_prms: false,
  prms_history_status: null,
  prms_justification: null,
  creator: null,
  updated_at: new Date('2026-04-09T08:07:00Z'),
  ...o,
});

const NO_ALIGN: Partial<PfmMonitoredRow> = {
  has_alignment: false,
  has_contribution: null,
  mapping_complete: null,
  primary_sp: null,
};
const SYNCED = { is_synced_to_prms: true };

// 13 rows, hand-classified. Rows are deliberately NOT in project-code order.
const ROWS: PfmMonitoredRow[] = [
  // r1 Ready (Approved+Complete+not sent); also contributes to SP03
  mk(1, 'P-A', { contributing_sps: [sp('SP03')] }),
  // r2 Complete + Submitted -> Ready to sync (Ready reads the mapping only)
  mk(2, 'P-A', {
    result_status_id: 2,
    result_status_name: 'Submitted',
    indicator_id: 2,
  }),
  // r3 Approved + Incomplete -> Mapping incomplete
  mk(3, 'P-A', { mapping_complete: false, primary_sp: sp('SP02') }),
  // r4 PRMS Approved
  mk(4, 'P-A', { ...SYNCED, prms_history_status: 'APPROVED' }),
  // r13 (belongs to P-D, listed early) Approved + Incomplete
  mk(13, 'P-D', { mapping_complete: false }),
  // r5 Draft, no alignment -> Mapping pending
  mk(5, 'P-B', {
    ...NO_ALIGN,
    result_status_id: 1,
    result_status_name: 'Editing',
    indicator_id: 3,
  }),
  // r6 Approved, no SP contribution -> out of scope (primary SP03 excluded from coverage)
  mk(6, 'P-B', { has_contribution: false, primary_sp: sp('SP03') }),
  // r7 synced, no history row -> PRMS Pending Review
  mk(7, 'P-B', { ...SYNCED, primary_sp: sp('SP02'), indicator_id: 4 }),
  // r8 PRMS Rejected
  mk(8, 'P-B', {
    ...SYNCED,
    prms_history_status: 'REJECTED',
    primary_sp: sp('SP02'),
    indicator_id: 6,
  }),
  // r9 Under review + Incomplete -> Mapping incomplete, primary SP03
  mk(9, 'P-C', {
    result_status_id: 3,
    result_status_name: 'Accepted',
    mapping_complete: false,
    primary_sp: sp('SP03'),
    indicator_id: 2,
  }),
  // r10 Returned (7), no alignment -> Mapping pending
  mk(10, 'P-C', { ...NO_ALIGN, result_status_id: 7, result_status_name: 'X' }),
  // r11 PRMS Approved, SP03
  mk(11, 'P-C', {
    ...SYNCED,
    prms_history_status: 'APPROVED',
    primary_sp: sp('SP03'),
  }),
  // r12 Approved, no SP contribution, no primary -> out of scope
  mk(12, 'P-C', { has_contribution: false, primary_sp: null, indicator_id: 2 }),
];

const derived = deriveMonitoredRows(ROWS);
const ids = (rows: { row: PfmMonitoredRow }[]): number[] =>
  rows.map((r) => r.row.result_id);

describe('pfm-aggregation', () => {
  describe('pipeline (R-PFM-006)', () => {
    it('assigns each stage by precedence with hand-written expectations', () => {
      const stageOf = (id: number): PfmStageKeyEnum =>
        assignPfmStage(derived.find((r) => r.row.result_id === id)!.d);
      // Red input: Complete + Submitted is Ready to sync (no STAR-status condition).
      expect(stageOf(2)).toBe(PfmStageKeyEnum.READY_TO_SYNC);
      expect(stageOf(5)).toBe(PfmStageKeyEnum.MAPPING_NOT_STARTED);
      expect(stageOf(10)).toBe(PfmStageKeyEnum.MAPPING_NOT_STARTED);
      // Started-but-unfinished mappings are Mapping pending too (no separate Incomplete).
      expect(stageOf(3)).toBe(PfmStageKeyEnum.MAPPING_NOT_STARTED);
      expect(stageOf(9)).toBe(PfmStageKeyEnum.MAPPING_NOT_STARTED);
      expect(stageOf(1)).toBe(PfmStageKeyEnum.READY_TO_SYNC);
      expect(stageOf(7)).toBe(PfmStageKeyEnum.PENDING_REVIEW);
      expect(stageOf(4)).toBe(PfmStageKeyEnum.APPROVED);
      expect(stageOf(8)).toBe(PfmStageKeyEnum.REJECTED);
      expect(stageOf(6)).toBe(PfmStageKeyEnum.NO_SP_CONTRIBUTION);
    });

    it('PRMS status wins over out of scope (precedence 1 before 2)', () => {
      const d = derivePfmRow(
        mk(99, 'P-Z', {
          has_contribution: false,
          ...SYNCED,
          prms_history_status: 'APPROVED',
        }),
      );
      expect(d.isOutOfScope).toBe(true);
      expect(assignPfmStage(d)).toBe(PfmStageKeyEnum.APPROVED);
    });

    it('counts every stage, header figures, and the stages sum to the total', () => {
      const p = buildPfmPipeline(derived);
      expect(p.stages).toEqual([
        { key: 'mapping_not_started', group: 'in_star', value: 5 },
        { key: 'ready_to_sync', group: 'in_star', value: 2 },
        { key: 'pending_review', group: 'in_prms', value: 1 },
        { key: 'approved', group: 'in_prms', value: 2 },
        { key: 'rejected', group: 'in_prms', value: 1 },
        { key: 'no_sp_contribution', group: 'out_of_scope', value: 2 },
      ]);
      expect(p.total).toBe(13);
      expect(p.in_scope).toBe(11);
      expect(p.not_synced).toBe(7);
      expect(p.in_prms).toBe(4);
      expect(p.out_of_scope).toBe(2);
      // Invariant: partition is exact. Hand-written 13, not recomputed.
      expect(p.stages.reduce((a, s) => a + s.value, 0)).toBe(13);
    });
  });

  describe('summary (R-PFM-005/007/008, R-PFM-002)', () => {
    const now = new Date('2026-10-08T12:00:00Z');
    const s = buildPfmSummary({
      scope: PfmScopeEnum.ALL,
      rows: derived,
      projectsTotal: 20,
      monthlySyncs: [
        { month: '2026-04', synced: 9 },
        { month: '2026-07', synced: 1 },
        { month: '2026-09', synced: 3 },
      ],
      syncedThisYear: 5,
      isPiOfAny: true,
      now,
    });

    it('KPIs', () => {
      expect(s.scope).toBe('all');
      expect(s.is_pi_of_any).toBe(true);
      expect(s.kpis).toEqual({
        projects: 4,
        projects_total: 20,
        monitored: 13,
        need_attention: 8,
        synced: 3,
        in_prms_scope: 11,
      });
      expect(s.synced_this_year).toBe(5);
    });

    it('cards agree with the queue', () => {
      const q = buildPfmQueue(derived, {});
      expect(s.kpis.need_attention).toBe(q.chip_counts.attention);
      const prms = s.pipeline.stages.filter((x) => x.group === 'in_prms');
      expect(prms.map((x) => x.value)).toEqual([1, 2, 1]);
      expect(s.kpis.synced).toBe(q.chip_counts.synced);
      // Need attention = Mapping incomplete + Ready to sync + Rejected; + Synced = the PRMS scope.
      expect(
        q.chip_counts.mapping +
          q.chip_counts.ready +
          q.chip_counts.prms_rejected,
      ).toBe(s.kpis.need_attention);
      expect(s.kpis.need_attention + s.kpis.synced).toBe(s.kpis.in_prms_scope);
      expect(s.chip_counts).toEqual(q.chip_counts);
    });

    it('SP coverage: primary only, out of scope and no-primary excluded, by code', () => {
      expect(s.sp_coverage).toEqual([
        { code: 'SP01', name: 'Program SP01', synced: 1, total: 4 },
        { code: 'SP02', name: 'Program SP02', synced: 2, total: 3 },
        { code: 'SP03', name: 'Program SP03', synced: 1, total: 2 },
      ]);
      expect(buildSpCoverage([])).toEqual([]);
    });

    it('monthly: six months incl. current, zero-filled, out-of-window ignored', () => {
      expect(s.monthly).toEqual([
        { month: '2026-05', synced: 0 },
        { month: '2026-06', synced: 0 },
        { month: '2026-07', synced: 1 },
        { month: '2026-08', synced: 0 },
        { month: '2026-09', synced: 3 },
        { month: '2026-10', synced: 0 },
      ]);
    });

    it('monthly crosses the year boundary', () => {
      expect(
        buildMonthlySeries([], new Date('2026-02-15T00:00:00Z')).map(
          (m) => m.month,
        ),
      ).toEqual([
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
        '2026-01',
        '2026-02',
      ]);
    });

    it('empty scope yields zeros, not NaN or missing keys', () => {
      const e = buildPfmSummary({
        scope: PfmScopeEnum.MINE,
        rows: [],
        projectsTotal: 3,
        monthlySyncs: [],
        syncedThisYear: 0,
        isPiOfAny: false,
        now,
      });
      expect(e.is_pi_of_any).toBe(false);
      expect(e.kpis.monitored).toBe(0);
      expect(e.pipeline.total).toBe(0);
      expect(e.pipeline.stages.every((x) => x.value === 0)).toBe(true);
    });
  });

  describe('queue (R-PFM-010/011/015)', () => {
    it('chip keys map explicitly to the design response keys', () => {
      expect(PFM_CHIP_COUNT_KEYS).toEqual({
        all: 'all',
        need_attention: 'attention',
        mapping_incomplete: 'mapping',
        ready_to_sync: 'ready',
        rejected: 'prms_rejected',
        synced: 'synced',
      });
    });

    it('unfiltered: chip counts, groups (ties by code), totals', () => {
      const q = buildPfmQueue(derived, {});
      expect(q.chip_counts).toEqual({
        all: 13,
        attention: 8,
        mapping: 5,
        ready: 2,
        prms_rejected: 1,
        synced: 3,
      });
      // P-B and P-C tie on attention (2): P-B first by code.
      expect(q.groups.map((g) => g.code)).toEqual(['P-A', 'P-B', 'P-C', 'P-D']);
      expect(q.groups[0]).toEqual({
        code: 'P-A',
        name: 'Project P-A',
        lead_pi: 'PI P-A',
        donor: 'Donor P-A',
        result_count: 4,
        attention: 3,
        counts: {
          approved: 1,
          pending: 0,
          rejected: 0,
          out_of_scope: 0,
          not_sent: 3,
        },
      });
      expect(q.groups[1].counts).toEqual({
        approved: 0,
        pending: 1,
        rejected: 1,
        out_of_scope: 1,
        not_sent: 1,
      });
      expect(q.groups[2].counts).toEqual({
        approved: 1,
        pending: 0,
        rejected: 0,
        out_of_scope: 1,
        not_sent: 2,
      });
      expect(q.groups.map((g) => g.result_count)).toEqual([4, 4, 4, 1]);
      expect(q.totals).toEqual({
        results: 13,
        projects: 4,
        monitored_total: 13,
      });
    });

    it('chip counts follow filters: Result type = 3', () => {
      const q = buildPfmQueue(derived, { type: 3 });
      expect(q.chip_counts).toEqual({
        all: 1,
        attention: 1,
        mapping: 1,
        ready: 0,
        prms_rejected: 0,
        synced: 0,
      });
      expect(q.totals).toEqual({
        results: 1,
        projects: 1,
        monitored_total: 13,
      });
    });

    // Red input: a chip applied before counting changes the counts.
    it('counts are taken BEFORE the chip, groups AFTER it', () => {
      const q = buildPfmQueue(derived, {
        project: 'P-A',
        chip: PfmChipEnum.NEED_ATTENTION,
      });
      expect(q.chip_counts).toEqual({
        all: 4,
        attention: 3,
        mapping: 1,
        ready: 2,
        prms_rejected: 0,
        synced: 1,
      });
      expect(q.groups).toHaveLength(1);
      expect(q.groups[0].result_count).toBe(3);
      expect(q.groups[0].counts.approved).toBe(0);
      expect(q.totals).toEqual({
        results: 3,
        projects: 1,
        monitored_total: 13,
      });
    });

    it('a chip with no matches removes groups but keeps counts', () => {
      const q = buildPfmQueue(derived, {
        project: 'P-D',
        chip: PfmChipEnum.REJECTED,
      });
      expect(q.groups).toEqual([]);
      expect(q.totals).toEqual({
        results: 0,
        projects: 0,
        monitored_total: 13,
      });
      expect(q.chip_counts.all).toBe(1);
    });

    it('filters combine with AND; SP matches primary or contributing', () => {
      const bySp = buildPfmQueue(derived, { sp: 'SP03' });
      // r1 (contributing), r6, r9, r11 (primary)
      expect(bySp.totals.results).toBe(4);
      expect(bySp.chip_counts.all).toBe(4);
      const spAndType = buildPfmQueue(derived, { sp: 'SP03', type: 2 });
      expect(spAndType.totals.results).toBe(1); // r9
      const typeAndProject = buildPfmQueue(derived, {
        type: 2,
        project: 'P-C',
      });
      expect(typeAndProject.totals.results).toBe(2); // r9, r12
      expect(buildPfmQueue(derived, { type: 2 }).totals.results).toBe(3);
    });

    it('monitored_total is ALL monitored results of the scope, not the attention count', () => {
      // 13 monitored, 8 need attention: the two meanings differ.
      const q = buildPfmQueue(derived, { project: 'P-D' });
      expect(q.totals.monitored_total).toBe(13);
      expect(q.chip_counts.attention).toBe(1);
    });

    it('group flag copy', () => {
      expect(pfmAttentionFlag(0)).toBe('All clear');
      expect(pfmAttentionFlag(1)).toBe('1 needs attention');
      expect(pfmAttentionFlag(3)).toBe('3 need attention');
    });

    it('group sums: counts always add up to result_count', () => {
      for (const g of buildPfmGroups(derived)) {
        const c = g.counts;
        expect(
          c.approved + c.pending + c.rejected + c.out_of_scope + c.not_sent,
        ).toBe(g.result_count);
      }
    });
  });

  describe('project progress (coverage tab: who is behind)', () => {
    // Hand-classified from the 13 rows above. done = in PRMS + out of scope.
    it('per project: done / remaining and the stage split, furthest behind first, ties by code', () => {
      const p = buildProjectProgress(derived);
      expect(p.map((x) => [x.code, x.total, x.done, x.remaining])).toEqual([
        ['P-A', 4, 1, 3],
        ['P-C', 4, 2, 2],
        ['P-B', 4, 3, 1],
        ['P-D', 1, 0, 1],
      ]);
      expect(p[0]).toEqual({
        code: 'P-A',
        name: 'Project P-A',
        lead_pi: 'PI P-A',
        total: 4,
        done: 1,
        remaining: 3,
        to_map: 1,
        ready: 2,
        in_prms: 1,
        out_of_scope: 0,
        pending_review: 0,
        approved: 1,
        rejected: 0,
      });
      const pb = p.find((x) => x.code === 'P-B')!;
      expect([
        pb.to_map,
        pb.out_of_scope,
        pb.pending_review,
        pb.rejected,
      ]).toEqual([1, 1, 1, 1]);
    });

    it('stage split always adds up to the total, and done matches the pipeline', () => {
      const p = buildProjectProgress(derived);
      for (const x of p) {
        expect(x.to_map + x.ready + x.in_prms + x.out_of_scope).toBe(x.total);
        expect(x.pending_review + x.approved + x.rejected).toBe(x.in_prms);
      }
      const pipe = buildPfmPipeline(derived);
      expect(p.reduce((a, x) => a + x.done, 0)).toBe(
        pipe.in_prms + pipe.out_of_scope,
      );
    });

    it('is part of the summary', () => {
      const s = buildPfmSummary({
        scope: PfmScopeEnum.ALL,
        rows: derived,
        projectsTotal: 4,
        monthlySyncs: [],
        syncedThisYear: 0,
        isPiOfAny: true,
        now: new Date('2026-10-08T12:00:00Z'),
      });
      expect(s.project_progress.map((x) => x.code)).toEqual([
        'P-A',
        'P-C',
        'P-B',
        'P-D',
      ]);
      expect(s.prms_rejection_reasons).toEqual([
        { reason: PFM_NO_REASON, count: 1 },
      ]);
    });
  });

  describe('PRMS rejection reasons', () => {
    it('groups rejected results by justification; blank or missing reads as no reason; count desc then reason', () => {
      const rows = deriveMonitoredRows([
        mk(90, 'P-Z', {
          ...SYNCED,
          prms_history_status: 'REJECTED',
          prms_justification: 'Wrong ToC',
        }),
        mk(91, 'P-Z', {
          ...SYNCED,
          prms_history_status: 'REJECTED',
          prms_justification: ' Wrong ToC ',
        }),
        mk(92, 'P-Z', {
          ...SYNCED,
          prms_history_status: 'REJECTED',
          prms_justification: 'Missing evidence',
        }),
        mk(93, 'P-Z', {
          ...SYNCED,
          prms_history_status: 'REJECTED',
          prms_justification: '   ',
        }),
        mk(94, 'P-Z', {
          ...SYNCED,
          prms_history_status: 'REJECTED',
          prms_justification: null,
        }),
        // not rejected: never counted, even with a justification
        mk(95, 'P-Z', {
          ...SYNCED,
          prms_history_status: 'APPROVED',
          prms_justification: 'Wrong ToC',
        }),
        mk(96, 'P-Z', { prms_justification: 'Wrong ToC' }),
      ]);
      expect(buildRejectionReasons(rows)).toEqual([
        { reason: 'No reason given', count: 2 },
        { reason: 'Wrong ToC', count: 2 },
        { reason: 'Missing evidence', count: 1 },
      ]);
      expect(buildRejectionReasons([])).toEqual([]);
    });
  });

  describe('row ranking (R-PFM-012)', () => {
    it('ranks attention, out of scope, pending, approved, rest; stable on ties', () => {
      expect(ids(rankPfmRows(derived))).toEqual([
        1, 2, 3, 13, 5, 8, 9, 10, 6, 12, 7, 4, 11,
      ]);
    });
  });
});
