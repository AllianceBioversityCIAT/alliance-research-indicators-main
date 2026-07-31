import { ContractFullReports } from '@interfaces/contract-full-reports.interface';
import { ProjectDashboardRankedListItem } from '@interfaces/project-dashboard.interface';
import { CAPACITY_SHARING_INDICATOR_ID, INNOVATION_DEVELOPMENT_INDICATOR_ID } from '@shared/utils/star-pdf-report.util';
import { mockContractFullReports } from 'src/app/testing/contract-full-reports.mock';
import {
  DEGREE_FILTER_SCOPE_NOTE,
  GENDER_PROVENANCE_NOTE,
  IndicatorMetadataBandModel,
  IndicatorMetadataCardModel,
  IndicatorMetadataSectionKey,
  IndicatorSummaryForBands,
  UNLABELLED_CATEGORY_FALLBACK,
  buildIndicatorMetadataBands
} from './indicator-metadata-bands.mapper';

// Verified elsewhere in the codebase — see the mapper's header comment for
// citations. Not re-derived here so a copy/paste typo can't silently diverge
// from the source of truth.
const POLICY_CHANGE_INDICATOR_ID = 4;
const OICR_INDICATOR_ID = 5;

function findCard(bands: IndicatorMetadataBandModel[], sectionKey: IndicatorMetadataSectionKey): IndicatorMetadataCardModel {
  for (const band of bands) {
    const card = band.cards.find(candidate => candidate.sectionKey === sectionKey);
    if (card) {
      return card;
    }
  }
  throw new Error(`No card found for section "${sectionKey}"`);
}

function toRankedItems(rows: ContractFullReports['innovation_nature']): ProjectDashboardRankedListItem[] {
  return rows.map(row => ({ id: String(row.id), label: row.name ?? UNLABELLED_CATEGORY_FALLBACK, count: row.count }));
}

/** All four indicators present, already in descending-`value` order. */
function allIndicatorSummaries(): IndicatorSummaryForBands[] {
  return [
    { id: CAPACITY_SHARING_INDICATOR_ID, indicatorId: CAPACITY_SHARING_INDICATOR_ID, label: 'Capacity Sharing for Development', value: 90, color: '#1689CA' },
    { id: INNOVATION_DEVELOPMENT_INDICATOR_ID, indicatorId: INNOVATION_DEVELOPMENT_INDICATOR_ID, label: 'Innovation Development', value: 55, color: '#7CB580' },
    { id: POLICY_CHANGE_INDICATOR_ID, indicatorId: POLICY_CHANGE_INDICATOR_ID, label: 'Policy Change', value: 30, color: '#173f6f' },
    { id: OICR_INDICATOR_ID, indicatorId: OICR_INDICATOR_ID, label: 'Outcome Impact Case Report (OICR)', value: 12, color: '#CF0808' }
  ];
}

describe('buildIndicatorMetadataBands', () => {
  describe('per-entry data binding (R-IMC-008 AC.1/AC.2, DC-5, KZ-005)', () => {
    // Each assertion below checks ONE card against ONE section of the
    // canonical fixture — never a count. A cross-wire between any two of the
    // 10 cards fails exactly one (or two) of these, never all of them, which
    // is what the mutation-kill run below verifies.
    const payload = mockContractFullReports();
    const bands = buildIndicatorMetadataBands(payload, allIndicatorSummaries());

    it('binds the Innovation Nature card to `innovation_nature`', () => {
      const card = findCard(bands, 'innovation_nature');
      expect(card.title).toBe('Innovation Nature');
      expect(card.items).toEqual(toRankedItems(payload.innovation_nature));
      expect(card.empty).toBe(false);
    });

    it('binds the Innovation Type card to `innovation_type`', () => {
      const card = findCard(bands, 'innovation_type');
      expect(card.title).toBe('Innovation Type');
      expect(card.items).toEqual(toRankedItems(payload.innovation_type));
      expect(card.empty).toBe(false);
    });

    it('binds the Current Readiness card to `innovation_readiness` (the >5-category fixture)', () => {
      const card = findCard(bands, 'innovation_readiness');
      expect(card.title).toBe('Current Readiness');
      expect(card.items).toEqual(toRankedItems(payload.innovation_readiness));
      expect(card.items).toHaveLength(10);
    });

    it('binds the OICR Maturity card to `oicr_maturity`', () => {
      const card = findCard(bands, 'oicr_maturity');
      expect(card.title).toBe('OICR Maturity');
      expect(card.items).toEqual(toRankedItems(payload.oicr_maturity));
      expect(card.items).toHaveLength(3);
    });

    it('binds the Policy Type card to `policy_type` (the exactly-5 boundary fixture)', () => {
      const card = findCard(bands, 'policy_type');
      expect(card.title).toBe('Policy Type');
      expect(card.items).toEqual(toRankedItems(payload.policy_type));
      expect(card.items).toHaveLength(5);
    });

    it('binds the Stage in Policy Process card to `policy_stage` (the empty-array fixture)', () => {
      const card = findCard(bands, 'policy_stage');
      expect(card.title).toBe('Stage in Policy Process');
      expect(card.items).toEqual([]);
    });

    it('binds the "Training or engagement to report" card to `session_format`', () => {
      const card = findCard(bands, 'session_format');
      expect(card.title).toBe('Training or engagement to report');
      expect(card.items).toEqual(toRankedItems(payload.session_format));
    });

    it('binds the "Training vs. Engagement" card to `session_type`, preserving the fixture\'s deliberate out-of-order rows', () => {
      const card = findCard(bands, 'session_type');
      expect(card.title).toBe('Training vs. Engagement');
      expect(card.items).toEqual(toRankedItems(payload.session_type));
      // The fixture is deliberately NOT `count DESC` (Engagement(25) before
      // Training(40)) so this proves the mapper does not silently re-sort
      // card items — ordering within a card is the server's job.
      expect(card.items[0].label).toBe('Engagement');
      expect(card.items[1].label).toBe('Training');
    });

    it('binds the Gender card to `gender_distribution` and carries its provenance note', () => {
      const card = findCard(bands, 'gender_distribution');
      expect(card.title).toBe('Gender');
      expect(card.items).toEqual(toRankedItems(payload.gender_distribution));
      expect(card.provenanceNote).toBe(GENDER_PROVENANCE_NOTE);
      expect(card.filterScopeNote).toBeUndefined();
    });

    it('binds the Degree card to `degree` and carries its filter-scope note', () => {
      const card = findCard(bands, 'degree');
      expect(card.title).toBe('Degree');
      expect(card.items).toEqual(toRankedItems(payload.degree));
      expect(card.filterScopeNote).toBe(DEGREE_FILTER_SCOPE_NOTE);
      expect(card.provenanceNote).toBeUndefined();
    });

    it('does not leak the Gender/Degree notes onto any other card', () => {
      for (const band of bands) {
        for (const card of band.cards) {
          if (card.sectionKey === 'gender_distribution' || card.sectionKey === 'degree') {
            continue;
          }
          expect(card.provenanceNote).toBeUndefined();
          expect(card.filterScopeNote).toBeUndefined();
        }
      }
    });
  });

  describe('band composition and order (R-IMC-008 AC.3)', () => {
    it('groups cards under the right indicator: 3/4/2/1', () => {
      const bands = buildIndicatorMetadataBands(mockContractFullReports(), allIndicatorSummaries());
      const byIndicator = new Map(bands.map(band => [band.indicatorId, band]));

      expect(byIndicator.get(INNOVATION_DEVELOPMENT_INDICATOR_ID)?.cards.map(card => card.sectionKey)).toEqual([
        'innovation_nature',
        'innovation_type',
        'innovation_readiness'
      ]);
      expect(byIndicator.get(CAPACITY_SHARING_INDICATOR_ID)?.cards.map(card => card.sectionKey)).toEqual([
        'session_format',
        'session_type',
        'gender_distribution',
        'degree'
      ]);
      expect(byIndicator.get(POLICY_CHANGE_INDICATOR_ID)?.cards.map(card => card.sectionKey)).toEqual(['policy_type', 'policy_stage']);
      expect(byIndicator.get(OICR_INDICATOR_ID)?.cards.map(card => card.sectionKey)).toEqual(['oicr_maturity']);
    });

    it('orders bands by descending result count, from a fixture whose indicator order is deliberately NOT descending', () => {
      // Ascending on purpose — the opposite of what the correct output must
      // be. If the mapper merely preserved input order, this fixture would
      // catch it: the assertion below would see OICR first, not last.
      const misOrderedSummaries: IndicatorSummaryForBands[] = [
        { id: OICR_INDICATOR_ID, indicatorId: OICR_INDICATOR_ID, label: 'OICR', value: 12, color: '#CF0808' },
        { id: POLICY_CHANGE_INDICATOR_ID, indicatorId: POLICY_CHANGE_INDICATOR_ID, label: 'Policy Change', value: 30, color: '#173f6f' },
        { id: INNOVATION_DEVELOPMENT_INDICATOR_ID, indicatorId: INNOVATION_DEVELOPMENT_INDICATOR_ID, label: 'Innovation Development', value: 55, color: '#7CB580' },
        { id: CAPACITY_SHARING_INDICATOR_ID, indicatorId: CAPACITY_SHARING_INDICATOR_ID, label: 'Capacity Sharing for Development', value: 90, color: '#1689CA' }
      ];

      const bands = buildIndicatorMetadataBands(mockContractFullReports(), misOrderedSummaries);

      expect(bands.map(band => band.indicatorId)).toEqual([
        CAPACITY_SHARING_INDICATOR_ID,
        INNOVATION_DEVELOPMENT_INDICATOR_ID,
        POLICY_CHANGE_INDICATOR_ID,
        OICR_INDICATOR_ID
      ]);
      expect(bands.map(band => band.resultCount)).toEqual([90, 55, 30, 12]);
    });
  });

  describe('band visibility follows indicator presence (R-IMC-009 AC.2)', () => {
    it('produces no band at all for an indicator absent from indicatorsWithResults()', () => {
      const summariesWithoutOicr = allIndicatorSummaries().filter(summary => summary.indicatorId !== OICR_INDICATOR_ID);
      const bands = buildIndicatorMetadataBands(mockContractFullReports(), summariesWithoutOicr);

      expect(bands.some(band => band.indicatorId === OICR_INDICATOR_ID)).toBe(false);
      expect(bands).toHaveLength(3);
    });

    it('produces no bands and an empty array when no indicator has results', () => {
      const bands = buildIndicatorMetadataBands(mockContractFullReports(), []);
      expect(bands).toEqual([]);
    });
  });

  describe('unanswered-field empty state (R-IMC-010 AC.2)', () => {
    it('flags a card as empty (not absent) when its indicator has results but its own section is empty', () => {
      // The canonical fixture's `policy_stage` is `[]` while Policy Change
      // (indicatorId 4) is present with results — exactly R-IMC-010's case,
      // distinct from R-IMC-009's "no band at all" case exercised above.
      const bands = buildIndicatorMetadataBands(mockContractFullReports(), allIndicatorSummaries());

      const stageCard = findCard(bands, 'policy_stage');
      expect(stageCard.empty).toBe(true);
      expect(stageCard.items).toEqual([]);

      // The band itself is still present, and the card's Policy Change
      // sibling is unaffected — this is "empty", not "hidden".
      expect(bands.some(band => band.indicatorId === POLICY_CHANGE_INDICATOR_ID)).toBe(true);
      const typeCard = findCard(bands, 'policy_type');
      expect(typeCard.empty).toBe(false);
    });
  });

  describe('nullable label resolution (T-10 carried note)', () => {
    it('falls back to UNLABELLED_CATEGORY_FALLBACK for a null `name`, never the literal text "null"', () => {
      const payload: ContractFullReports = {
        ...mockContractFullReports(),
        policy_stage: [{ id: 9, name: null, count: 3 }]
      };

      const bands = buildIndicatorMetadataBands(payload, allIndicatorSummaries());
      const stageCard = findCard(bands, 'policy_stage');

      expect(stageCard.items).toEqual([{ id: '9', label: UNLABELLED_CATEGORY_FALLBACK, count: 3 }]);
      expect(stageCard.items[0].label).not.toBe('null');
      expect(stageCard.empty).toBe(false);
    });
  });

  describe('payload not yet loaded', () => {
    it('treats every section as empty rather than throwing when payload is null', () => {
      const bands = buildIndicatorMetadataBands(null, allIndicatorSummaries());

      expect(bands).toHaveLength(4);
      for (const band of bands) {
        for (const card of band.cards) {
          expect(card.items).toEqual([]);
          expect(card.empty).toBe(true);
        }
      }
    });
  });
});
