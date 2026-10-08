import { PfmChipEnum } from '../enum/pfm-chip.enum';
import { PfmMappingStateEnum as M } from '../enum/pfm-mapping-state.enum';
import { PfmPrmsStatusEnum as P } from '../enum/pfm-prms-status.enum';
import { PfmStatusFilterEnum as F } from '../enum/pfm-status-filter.enum';
import {
  derivePfmRow,
  deriveStarLabel,
  formatPfmDate,
  formatPfmDateTime,
  matchesChip,
  matchesStatusFilter,
  PfmRawRow,
  rowRank,
} from './pfm-derivation';

const raw = (o: Partial<PfmRawRow> = {}): PfmRawRow => ({
  result_status_id: 6,
  result_status_name: 'Approved',
  approved_at: new Date('2026-03-05T10:00:00Z'),
  has_alignment: 1,
  has_contribution: 1,
  mapping_complete: 1,
  primary_sp: { code: 'SP01', name: 'Breeding' },
  contributing_sp_names: [],
  is_synced_to_prms: 0,
  prms_history_status: null,
  prms_justification: null,
  updated_at: new Date('2026-04-09T08:07:00Z'),
  ...o,
});

describe('pfm-derivation', () => {
  describe('STAR label + PI line (R-PFM-004, D-3/D-4)', () => {
    // Red input: status 7 must be Returned (fails if mapped to Draft).
    it.each([
      [1, 'Editing', 'Draft', 'Not yet submitted in STAR'],
      [4, 'Draft', 'Draft', 'Not yet submitted in STAR'],
      [2, 'Submitted', 'Submitted', 'Awaiting PI sign-off'],
      [3, 'Accepted', 'Under review', 'In review'],
      [6, 'Approved', 'Approved', 'Approved 05 Mar 2026'],
      [5, 'Revised', 'Returned', 'Returned for revision'],
      [7, 'Rejected', 'Returned', 'Returned for revision'],
    ])('status %i (%s) -> %s / "%s"', (id, name, label, piLine) => {
      const d = derivePfmRow(
        raw({ result_status_id: id, result_status_name: name }),
      );
      expect(d.starLabel).toBe(label);
      expect(d.piLine).toBe(piLine);
    });

    it('any other status id is shown by its own name', () => {
      expect(deriveStarLabel(23, 'Bilateral pending review')).toBe(
        'Bilateral pending review',
      );
      expect(
        derivePfmRow(
          raw({ result_status_id: 23, result_status_name: 'Whatever' }),
        ).piLine,
      ).toBe('');
    });

    it('Approved without an approval date prints no date', () => {
      expect(derivePfmRow(raw({ approved_at: null })).piLine).toBe('Approved');
    });
  });

  describe('mapping state, note and SP line', () => {
    const sp = { code: 'SP05', name: 'Climate' };
    it.each([
      [
        'no alignment',
        { has_alignment: 0, has_contribution: null, mapping_complete: null },
        M.NOT_STARTED,
        'Starts after PI approval',
        '',
      ],
      [
        'declared no contribution',
        { has_alignment: 1, has_contribution: 0, mapping_complete: 1 },
        M.NO_SP_CONTRIBUTION,
        'PI declared no Science Program contribution · out of PRMS scope',
        'Not reported to PRMS',
      ],
      [
        'check fails',
        { has_alignment: 1, has_contribution: 1, mapping_complete: 0 },
        M.INCOMPLETE,
        'Projects or budget shares still missing',
        'SP05 Climate (primary)',
      ],
      [
        'check passes',
        { has_alignment: 1, has_contribution: 1, mapping_complete: 1 },
        M.COMPLETE,
        'Pool funding split recorded',
        'SP05 Climate (primary) · Water, Soils',
      ],
    ])('%s', (_n, flags, mapping, note, spLine) => {
      const contributing =
        mapping === M.COMPLETE ? ['Water', 'Soils'] : ['Ignored when hidden'];
      const d = derivePfmRow(
        raw({
          ...flags,
          primary_sp: sp,
          contributing_sp_names: mapping === M.INCOMPLETE ? [] : contributing,
        }),
      );
      expect(d.mappingState).toBe(mapping);
      expect(d.mappingNote).toBe(note);
      expect(d.spLine).toBe(spLine);
    });

    it('SP line variants: contributing only, none at all', () => {
      expect(
        derivePfmRow(raw({ primary_sp: null, contributing_sp_names: ['A'] }))
          .spLine,
      ).toBe('A');
      expect(
        derivePfmRow(raw({ primary_sp: null, contributing_sp_names: [] }))
          .spLine,
      ).toBe('');
    });
  });

  describe('PRMS status + hint', () => {
    // Red input: synced with no history row must be Pending Review (fails if Not sent).
    it.each([
      [0, null, null, P.NOT_SENT, 'Not synced to PRMS yet'],
      [1, null, null, P.PENDING_REVIEW, 'PRMS: Pending Review'],
      [1, 'PENDING_REVIEW', null, P.PENDING_REVIEW, 'PRMS: Pending Review'],
      [1, 'APPROVED', null, P.APPROVED, 'PRMS: Approved'],
      [1, 'REJECTED', 'Wrong donor', P.REJECTED, 'Wrong donor'],
      [1, 'REJECTED', null, P.REJECTED, 'PRMS: Rejected'],
      [0, 'APPROVED', 'stale', P.NOT_SENT, 'Not synced to PRMS yet'],
    ])('synced=%i hist=%s -> %s', (synced, hist, just, status, hint) => {
      const d = derivePfmRow(
        raw({
          is_synced_to_prms: synced,
          prms_history_status: hist,
          prms_justification: just,
        }),
      );
      expect(d.prmsStatus).toBe(status);
      expect(d.prmsHint).toBe(hint);
    });
  });

  describe('isOutOfScope / isReady / needsAttention (Glossary §2)', () => {
    it('approved + complete + never sent -> ready and needs attention', () => {
      const d = derivePfmRow(raw());
      expect(d.isReady).toBe(true);
      expect(d.needsAttention).toBe(true);
      expect(d.isOutOfScope).toBe(false);
    });

    // Red input: no contribution with complete mapping flag.
    it('has_contribution=0 + mapping_complete=1 -> No SP contribution, not needsAttention, not ready', () => {
      const d = derivePfmRow(raw({ has_contribution: 0, mapping_complete: 1 }));
      expect(d.mappingState).toBe(M.NO_SP_CONTRIBUTION);
      expect(d.isOutOfScope).toBe(true);
      expect(d.needsAttention).toBe(false);
      expect(d.isReady).toBe(false);
    });

    // Red input: mapping Complete but STAR status 2 is not ready.
    it('mapping Complete + status 2 -> not ready', () => {
      const d = derivePfmRow(
        raw({ result_status_id: 2, result_status_name: 'Submitted' }),
      );
      expect(d.mappingState).toBe(M.COMPLETE);
      expect(d.isReady).toBe(false);
      expect(d.needsAttention).toBe(true);
    });

    it('approved + incomplete -> not ready, needs attention', () => {
      const d = derivePfmRow(raw({ mapping_complete: 0 }));
      expect(d.isReady).toBe(false);
      expect(d.needsAttention).toBe(true);
    });

    it('already sent -> not ready, not needs attention', () => {
      const d = derivePfmRow(
        raw({ is_synced_to_prms: 1, prms_history_status: 'APPROVED' }),
      );
      expect(d.isReady).toBe(false);
      expect(d.needsAttention).toBe(false);
    });
  });

  describe('date formats', () => {
    it('dd Mon yyyy and dd Mon, HH:mm', () => {
      expect(formatPfmDate(new Date('2026-12-31T23:59:00Z'))).toBe(
        '31 Dec 2026',
      );
      expect(formatPfmDateTime(new Date('2026-01-02T03:04:00Z'))).toBe(
        '02 Jan, 03:04',
      );
      expect(derivePfmRow(raw()).updatedLabel).toBe('09 Apr, 08:07');
    });
  });

  describe('matchesStatusFilter (R-PFM-009)', () => {
    const rows = {
      ready: derivePfmRow(raw()),
      mappingPending: derivePfmRow(raw({ mapping_complete: 0 })),
      noSp: derivePfmRow(raw({ has_contribution: 0 })),
      synced: derivePfmRow(raw({ is_synced_to_prms: 1 })),
      submitted: derivePfmRow(
        raw({ result_status_id: 2, result_status_name: 'Submitted' }),
      ),
      review: derivePfmRow(
        raw({ result_status_id: 3, result_status_name: 'Accepted' }),
      ),
      draft: derivePfmRow(
        raw({ result_status_id: 4, result_status_name: 'Draft' }),
      ),
    };
    const matching = (f: F) =>
      Object.entries(rows)
        .filter(([, d]) => matchesStatusFilter(d, f))
        .map(([k]) => k);

    it.each([
      [F.ALL, Object.keys(rows)],
      [F.READY_TO_SYNC, ['ready']],
      [F.MAPPING_PENDING, ['mappingPending', 'noSp']],
      [F.SYNCED, ['synced']],
      [F.AWAITING_PI, ['submitted']],
      [F.UNDER_REVIEW, ['review']],
      [F.DRAFT, ['draft']],
    ])('%s', (filter, expected) => {
      expect(matching(filter)).toEqual(expected);
    });
  });

  describe('matchesChip (R-PFM-010)', () => {
    const rows = {
      ready: derivePfmRow(raw()),
      incomplete: derivePfmRow(raw({ mapping_complete: 0 })),
      noSp: derivePfmRow(raw({ has_contribution: 0 })),
      pending: derivePfmRow(raw({ is_synced_to_prms: 1 })),
      approvedPrms: derivePfmRow(
        raw({ is_synced_to_prms: 1, prms_history_status: 'APPROVED' }),
      ),
      rejected: derivePfmRow(
        raw({ is_synced_to_prms: 1, prms_history_status: 'REJECTED' }),
      ),
      draft: derivePfmRow(
        raw({ result_status_id: 4, result_status_name: 'Draft' }),
      ),
    };
    const matching = (c: PfmChipEnum) =>
      Object.entries(rows)
        .filter(([, d]) => matchesChip(d, c))
        .map(([k]) => k);

    it.each([
      [PfmChipEnum.ALL, Object.keys(rows)],
      [PfmChipEnum.NEED_ATTENTION, ['ready', 'incomplete', 'draft']],
      [PfmChipEnum.MAPPING_INCOMPLETE, ['incomplete']],
      [PfmChipEnum.READY_TO_SYNC, ['ready']],
      [PfmChipEnum.AWAITING_PI, ['draft']],
      [PfmChipEnum.REJECTED, ['rejected']],
      [PfmChipEnum.SYNCED, ['pending', 'approvedPrms']],
    ])('%s', (chip, expected) => {
      expect(matching(chip)).toEqual(expected);
    });
  });

  describe('rowRank (R-PFM-012)', () => {
    it('orders needs attention < out of scope < Pending Review < Approved < others', () => {
      const ranked = [
        derivePfmRow(
          raw({ is_synced_to_prms: 1, prms_history_status: 'REJECTED' }),
        ),
        derivePfmRow(
          raw({ is_synced_to_prms: 1, prms_history_status: 'APPROVED' }),
        ),
        derivePfmRow(raw({ is_synced_to_prms: 1 })),
        derivePfmRow(raw({ has_contribution: 0 })),
        derivePfmRow(raw()),
      ]
        .map((d) => rowRank(d))
        .sort((a, b) => a - b);
      expect(ranked).toEqual([0, 1, 2, 3, 4]);
      expect(rowRank(derivePfmRow(raw()))).toBe(0);
      expect(rowRank(derivePfmRow(raw({ has_contribution: 0 })))).toBe(1);
      expect(rowRank(derivePfmRow(raw({ is_synced_to_prms: 1 })))).toBe(2);
      expect(
        rowRank(
          derivePfmRow(
            raw({ is_synced_to_prms: 1, prms_history_status: 'APPROVED' }),
          ),
        ),
      ).toBe(3);
      expect(
        rowRank(
          derivePfmRow(
            raw({ is_synced_to_prms: 1, prms_history_status: 'REJECTED' }),
          ),
        ),
      ).toBe(4);
    });
  });
});
