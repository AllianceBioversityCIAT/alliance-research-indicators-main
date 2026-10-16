// @sdd-spec docs/specs/bugfix/bilateral-alliance-selector — T-01 / R-BAS-001, R-BAS-002, R-BAS-003, NFR-BAS-003
//
// Bug-Mode regression suite for project selector predicates.
// Fixtures carry the verbatim literal byte sequences measured in CLARISA on 2026-08-14.

import { ClarisaProject } from '../dto/clarisa-project.types';
import {
  ALLIANCE_CENTRE_ACRONYMS,
  ALLIANCE_CENTRE_SET,
  ALLIANCE_LEAD_ACRONYM_PREFIX,
  BILATERAL_FUNDING_PREFIX,
  isAllianceProject,
  isBilateralFunding,
  matchesPhase,
  normalizeToken,
} from './project-selector.util';

describe('project-selector.util', () => {
  describe('Exported Constants (DD-1, DD-2, DD-3)', () => {
    it('exports BILATERAL_FUNDING_PREFIX as BILATERAL', () => {
      expect(BILATERAL_FUNDING_PREFIX).toBe('BILATERAL');
    });

    it('exports ALLIANCE_LEAD_ACRONYM_PREFIX as ABC', () => {
      expect(ALLIANCE_LEAD_ACRONYM_PREFIX).toBe('ABC');
    });

    it('exports ALLIANCE_CENTRE_ACRONYMS with CIAT and BIOVERSITY', () => {
      expect(ALLIANCE_CENTRE_ACRONYMS).toEqual(['CIAT', 'BIOVERSITY']);
    });

    it('exports ALLIANCE_CENTRE_SET containing CIAT and BIOVERSITY', () => {
      expect(ALLIANCE_CENTRE_SET.has('CIAT')).toBe(true);
      expect(ALLIANCE_CENTRE_SET.has('BIOVERSITY')).toBe(true);
      expect(ALLIANCE_CENTRE_SET.has('IFPRI')).toBe(false);
      expect(ALLIANCE_CENTRE_SET.has('IITA')).toBe(false);
    });
  });

  describe('normalizeToken', () => {
    it('returns empty string for null, undefined, empty string, and whitespace-only', () => {
      expect(normalizeToken(null)).toBe('');
      expect(normalizeToken(undefined)).toBe('');
      expect(normalizeToken('')).toBe('');
      expect(normalizeToken('   ')).toBe('');
      expect(normalizeToken('\t\n ')).toBe('');
    });

    it('trims, collapses internal whitespace runs, and upper-cases', () => {
      expect(normalizeToken('Bilateral')).toBe('BILATERAL');
      expect(normalizeToken('BILATERAL - RESTRICTED')).toBe(
        'BILATERAL - RESTRICTED',
      );
      expect(normalizeToken('Bilateral - Restricted')).toBe(
        'BILATERAL - RESTRICTED',
      );
      expect(normalizeToken('BILATERAL- RESTRICTED')).toBe(
        'BILATERAL- RESTRICTED',
      );
      expect(normalizeToken(' ciat ')).toBe('CIAT');
      expect(normalizeToken('BIOVERSITY')).toBe('BIOVERSITY');
      expect(normalizeToken('ABC')).toBe('ABC');
      expect(normalizeToken('ABC - Bioversity (Alliance)')).toBe(
        'ABC - BIOVERSITY (ALLIANCE)',
      );
      expect(normalizeToken('IFPRI')).toBe('IFPRI');
      expect(normalizeToken('ICARDA')).toBe('ICARDA');
      expect(normalizeToken('IITA')).toBe('IITA');
      expect(normalizeToken('CIMMYT')).toBe('CIMMYT');
    });
  });

  describe('isBilateralFunding (R-BAS-001, DD-2)', () => {
    describe('positive observed production values', () => {
      it('accepts Bilateral', () => {
        expect(isBilateralFunding('Bilateral')).toBe(true);
      });

      it('accepts BILATERAL - RESTRICTED', () => {
        expect(isBilateralFunding('BILATERAL - RESTRICTED')).toBe(true);
      });

      it('accepts Bilateral - Restricted', () => {
        expect(isBilateralFunding('Bilateral - Restricted')).toBe(true);
      });

      it('accepts BILATERAL- RESTRICTED (no space before dash)', () => {
        expect(isBilateralFunding('BILATERAL- RESTRICTED')).toBe(true);
      });

      it('accepts lowercase bilateral from test feed', () => {
        expect(isBilateralFunding('bilateral')).toBe(true);
      });
    });

    describe('positive W3 family values (R-W3B-001)', () => {
      it('accepts Window 3', () => {
        expect(isBilateralFunding('Window 3')).toBe(true);
      });

      it('accepts Window 3 - Restricted', () => {
        expect(isBilateralFunding('Window 3 - Restricted')).toBe(true);
      });

      it('accepts WINDOW 3 - RESTRICTED', () => {
        expect(isBilateralFunding('WINDOW 3 - RESTRICTED')).toBe(true);
      });

      it('accepts Windows 3', () => {
        expect(isBilateralFunding('Windows 3')).toBe(true);
      });

      it('accepts W3', () => {
        expect(isBilateralFunding('W3')).toBe(true);
      });

      it('accepts window3 (no-space spelling used by 28 of 198 stub rows, AC.3)', () => {
        expect(isBilateralFunding('window3')).toBe(true);
      });
    });

    describe('negative excluded values (R-W3B-001; OQ-A superseded — W3 spellings moved to the positive block above)', () => {
      it('excludes SRV', () => {
        expect(isBilateralFunding('SRV')).toBe(false);
      });

      it('excludes null, undefined, empty string, and whitespace-only', () => {
        expect(isBilateralFunding(null)).toBe(false);
        expect(isBilateralFunding(undefined)).toBe(false);
        expect(isBilateralFunding('')).toBe(false);
        expect(isBilateralFunding('   ')).toBe(false);
      });

      it('excludes non-bilateral prefixes like NON-BILATERAL', () => {
        expect(isBilateralFunding('NON-BILATERAL')).toBe(false);
      });
    });
  });

  describe('isAllianceProject (R-BAS-002, DD-3)', () => {
    describe('when source_center_acronym is populated (new contract)', () => {
      it('accepts CIAT without consulting lead institution', () => {
        expect(
          isAllianceProject({
            source_center_acronym: 'CIAT',
            lead_institution_object: null,
          }),
        ).toBe(true);
      });

      it('accepts BIOVERSITY without consulting lead institution', () => {
        expect(
          isAllianceProject({
            source_center_acronym: 'BIOVERSITY',
            lead_institution_object: null,
          }),
        ).toBe(true);
      });

      it('accepts padded/lowercase ciat ( ciat )', () => {
        expect(
          isAllianceProject({
            source_center_acronym: ' ciat ',
            lead_institution_object: null,
          }),
        ).toBe(true);
      });

      it('excludes other centres (IITA, IFPRI, ICARDA, CIMMYT) even if lead institution is ABC', () => {
        expect(
          isAllianceProject({
            source_center_acronym: 'IITA',
            lead_institution_object: {
              id: 1,
              name: 'Alliance of Bioversity and CIAT',
              acronym: 'ABC',
            },
          }),
        ).toBe(false);

        expect(
          isAllianceProject({
            source_center_acronym: 'IFPRI',
            lead_institution_object: {
              id: 1,
              name: 'Alliance of Bioversity and CIAT',
              acronym: 'ABC',
            },
          }),
        ).toBe(false);

        expect(
          isAllianceProject({
            source_center_acronym: 'ICARDA',
            lead_institution_object: {
              id: 1,
              name: 'Alliance of Bioversity and CIAT',
              acronym: 'ABC',
            },
          }),
        ).toBe(false);

        expect(
          isAllianceProject({
            source_center_acronym: 'CIMMYT',
            lead_institution_object: {
              id: 1,
              name: 'Alliance of Bioversity and CIAT',
              acronym: 'ABC',
            },
          }),
        ).toBe(false);
      });
    });

    describe('when source_center_acronym is null, undefined, or empty (legacy shape fallback)', () => {
      it('accepts ABC lead acronym', () => {
        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: {
              id: 1,
              name: 'Alliance of Bioversity and CIAT',
              acronym: 'ABC',
            },
          }),
        ).toBe(true);

        expect(
          isAllianceProject({
            source_center_acronym: undefined,
            lead_institution_object: {
              id: 1,
              name: 'Alliance of Bioversity and CIAT',
              acronym: 'ABC',
            },
          }),
        ).toBe(true);

        expect(
          isAllianceProject({
            source_center_acronym: '',
            lead_institution_object: {
              id: 1,
              name: 'Alliance of Bioversity and CIAT',
              acronym: 'ABC',
            },
          }),
        ).toBe(true);
      });

      it('accepts ABC - Bioversity (Alliance)', () => {
        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: {
              id: 1,
              name: 'Alliance of Bioversity and CIAT',
              acronym: 'ABC - Bioversity (Alliance)',
            },
          }),
        ).toBe(true);
      });

      it('excludes non-Alliance lead acronyms (IFPRI, ICARDA, IITA, CIMMYT, empty)', () => {
        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: {
              id: 2,
              name: 'IFPRI',
              acronym: 'IFPRI',
            },
          }),
        ).toBe(false);

        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: {
              id: 3,
              name: 'ICARDA',
              acronym: 'ICARDA',
            },
          }),
        ).toBe(false);

        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: {
              id: 4,
              name: 'IITA',
              acronym: 'IITA',
            },
          }),
        ).toBe(false);

        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: {
              id: 5,
              name: 'CIMMYT',
              acronym: 'CIMMYT',
            },
          }),
        ).toBe(false);

        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: {
              id: 6,
              name: 'Unknown',
              acronym: '',
            },
          }),
        ).toBe(false);

        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: {
              id: 7,
              name: 'Unknown',
              acronym: null,
            },
          }),
        ).toBe(false);
      });

      it('does not match bounded non-Alliance acronyms like ABCD or ABC1', () => {
        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: {
              id: 8,
              name: 'ABCD Test',
              acronym: 'ABCD',
            },
          }),
        ).toBe(false);

        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: {
              id: 9,
              name: 'ABC1 Test',
              acronym: 'ABC1',
            },
          }),
        ).toBe(false);
      });

      it('returns false if lead_institution_object is missing or project is null/undefined', () => {
        expect(
          isAllianceProject({
            source_center_acronym: null,
            lead_institution_object: null,
          }),
        ).toBe(false);

        expect(isAllianceProject(null)).toBe(false);
        expect(isAllianceProject(undefined)).toBe(false);
      });
    });
  });

  describe('matchesPhase (R-BAS-003)', () => {
    it('returns true when phase is absent, null, undefined, or empty/whitespace', () => {
      expect(matchesPhase(null, 2026)).toBe(true);
      expect(matchesPhase(undefined, 2026)).toBe(true);
      expect(matchesPhase('', 2026)).toBe(true);
      expect(matchesPhase('   ', 2026)).toBe(true);
    });

    it('returns true when numeric phase matches target phase', () => {
      expect(matchesPhase(2026, 2026)).toBe(true);
      expect(matchesPhase('2026', 2026)).toBe(true);
      expect(matchesPhase(2025, 2025)).toBe(true);
    });

    it('returns false when phase does not match target phase', () => {
      expect(matchesPhase(2025, 2026)).toBe(false);
      expect(matchesPhase('2025', 2026)).toBe(false);
      expect(matchesPhase(2027, 2026)).toBe(false);
    });

    it('returns false for non-numeric phase strings', () => {
      expect(matchesPhase('abc', 2026)).toBe(false);
      expect(matchesPhase('phase-1', 2026)).toBe(false);
    });
  });

  describe('Bug-Mode Regression Suite: Production-Shaped Dataset (30 eligible vs 1 pre-fix)', () => {
    // 25 Bilateral + 5 W3-family eligible rows + negative rows mirroring real CLARISA production feed
    const allianceInstitution = {
      id: 1,
      name: 'Alliance of Bioversity International and CIAT',
      acronym: 'ABC',
    };

    const allianceInstitutionLongAcronym = {
      id: 1,
      name: 'Alliance of Bioversity International and CIAT',
      acronym: 'ABC - Bioversity (Alliance)',
    };

    const productionFixture: ClarisaProject[] = [
      // 1. One project with 'Bilateral' (the only 1 matched by pre-fix code)
      {
        id: 101,
        short_name: 'PROD-01',
        source_of_funding: 'Bilateral',
        lead_institution_object: allianceInstitution,
      },
      // 2..11. Ten projects with 'BILATERAL - RESTRICTED'
      ...Array.from({ length: 10 }, (_, i) => ({
        id: 200 + i,
        short_name: `PROD-BILATERAL-RESTRICTED-${i + 1}`,
        source_of_funding: 'BILATERAL - RESTRICTED',
        lead_institution_object: allianceInstitution,
      })),
      // 12..24. Thirteen projects with 'Bilateral - Restricted' (mix of ABC and ABC - Bioversity (Alliance))
      ...Array.from({ length: 13 }, (_, i) => ({
        id: 300 + i,
        short_name: `PROD-Bilateral-Restricted-${i + 1}`,
        source_of_funding: 'Bilateral - Restricted',
        lead_institution_object:
          i % 2 === 0 ? allianceInstitution : allianceInstitutionLongAcronym,
      })),
      // 25. One project with 'BILATERAL- RESTRICTED' (no space before dash)
      {
        id: 401,
        short_name: 'PROD-BILATERAL-NO-SPACE',
        source_of_funding: 'BILATERAL- RESTRICTED',
        lead_institution_object: allianceInstitution,
      },

      // --- W3-FAMILY ROWS (eligible since R-W3B-001) ---
      {
        id: 501,
        short_name: 'PROD-W3-1',
        source_of_funding: 'Window 3',
        lead_institution_object: allianceInstitution,
      },
      {
        id: 502,
        short_name: 'PROD-W3-2',
        source_of_funding: 'Window 3 - Restricted',
        lead_institution_object: allianceInstitution,
      },
      {
        id: 503,
        short_name: 'PROD-W3-3',
        source_of_funding: 'WINDOW 3 - RESTRICTED',
        lead_institution_object: allianceInstitution,
      },
      {
        id: 504,
        short_name: 'PROD-W3-4',
        source_of_funding: 'Windows 3',
        lead_institution_object: allianceInstitution,
      },
      {
        id: 505,
        short_name: 'PROD-W3-5',
        source_of_funding: 'W3',
        lead_institution_object: allianceInstitution,
      },
      // --- NEGATIVE ROWS (Must be excluded) ---
      {
        id: 506,
        short_name: 'PROD-SRV',
        source_of_funding: 'SRV',
        lead_institution_object: allianceInstitution,
      },

      // Null / whitespace funding (1 observed in production)
      {
        id: 601,
        short_name: 'PROD-NULL-FUNDING',
        source_of_funding: null as unknown as string,
        lead_institution_object: allianceInstitution,
      },
      {
        id: 602,
        short_name: 'PROD-BLANK-FUNDING',
        source_of_funding: '   ',
        lead_institution_object: allianceInstitution,
      },

      // Non-Alliance lead institutions
      {
        id: 701,
        short_name: 'PROD-IFPRI',
        source_of_funding: 'BILATERAL - RESTRICTED',
        lead_institution_object: {
          id: 2,
          name: 'International Food Policy Research Institute',
          acronym: 'IFPRI',
        },
      },
      {
        id: 702,
        short_name: 'PROD-ICARDA',
        source_of_funding: 'BILATERAL - RESTRICTED',
        lead_institution_object: {
          id: 3,
          name: 'International Center for Agricultural Research in the Dry Areas',
          acronym: 'ICARDA',
        },
      },
      {
        id: 703,
        short_name: 'PROD-IITA',
        source_of_funding: 'BILATERAL - RESTRICTED',
        lead_institution_object: {
          id: 4,
          name: 'International Institute of Tropical Agriculture',
          acronym: 'IITA',
        },
      },
      {
        id: 704,
        short_name: 'PROD-CIMMYT',
        source_of_funding: 'BILATERAL - RESTRICTED',
        lead_institution_object: {
          id: 5,
          name: 'International Maize and Wheat Improvement Center',
          acronym: 'CIMMYT',
        },
      },
      {
        id: 705,
        short_name: 'PROD-EMPTY-LEAD',
        source_of_funding: 'BILATERAL - RESTRICTED',
        lead_institution_object: {
          id: 6,
          name: 'Unknown Organization',
          acronym: '',
        },
      },
      {
        id: 706,
        short_name: 'PROD-NULL-LEAD',
        source_of_funding: 'BILATERAL - RESTRICTED',
        lead_institution_object: null,
      },

      // Non-Alliance source_center_acronym (even with lead ABC)
      {
        id: 801,
        short_name: 'PROD-IITA-CENTER',
        source_of_funding: 'BILATERAL - RESTRICTED',
        source_center_acronym: 'IITA',
        lead_institution_object: allianceInstitution,
      },

      // Different phase (2025 excluded when target is 2026)
      {
        id: 901,
        short_name: 'PROD-PHASE-2025',
        source_of_funding: 'BILATERAL - RESTRICTED',
        phase: 2025,
        lead_institution_object: allianceInstitution,
      },
    ];

    it('returns 30 eligible projects with the widened selector predicates (R-W3B-001 admits 5 more W3 rows)', () => {
      const eligible = productionFixture.filter(
        (p) =>
          isBilateralFunding(p.source_of_funding) &&
          isAllianceProject(p) &&
          matchesPhase(p.phase, 2026),
      );

      expect(eligible.length).toBe(30);
    });

    it('reproduces the bug: pre-fix predicate returns only 1 project', () => {
      // Pre-fix logic from clarisa-projects.service.ts before this bugfix
      const preFixEligible = productionFixture.filter(
        (p) =>
          p.source_of_funding === 'Bilateral' &&
          p.lead_institution_object?.acronym === 'ABC',
      );

      expect(preFixEligible.length).toBe(1);
      expect(preFixEligible[0].id).toBe(101);
    });

    it('admits all Window 3 family projects (5 rows, R-W3B-001) but keeps SRV excluded', () => {
      const eligible = productionFixture.filter(
        (p) =>
          isBilateralFunding(p.source_of_funding) &&
          isAllianceProject(p) &&
          matchesPhase(p.phase, 2026),
      );

      const window3Ids = [501, 502, 503, 504, 505];
      for (const id of window3Ids) {
        expect(eligible.some((p) => p.id === id)).toBe(true);
      }

      expect(eligible.some((p) => p.id === 506)).toBe(false);
    });

    it('excludes null and whitespace funding projects', () => {
      const eligible = productionFixture.filter(
        (p) =>
          isBilateralFunding(p.source_of_funding) &&
          isAllianceProject(p) &&
          matchesPhase(p.phase, 2026),
      );

      expect(eligible.some((p) => p.id === 601)).toBe(false);
      expect(eligible.some((p) => p.id === 602)).toBe(false);
    });

    it('excludes non-Alliance lead institutions (IFPRI, ICARDA, IITA, CIMMYT, empty, null)', () => {
      const eligible = productionFixture.filter(
        (p) =>
          isBilateralFunding(p.source_of_funding) &&
          isAllianceProject(p) &&
          matchesPhase(p.phase, 2026),
      );

      const nonAllianceIds = [701, 702, 703, 704, 705, 706];
      for (const id of nonAllianceIds) {
        expect(eligible.some((p) => p.id === id)).toBe(false);
      }
    });

    it('excludes projects where source_center_acronym is IITA even when lead acronym is ABC', () => {
      const eligible = productionFixture.filter(
        (p) =>
          isBilateralFunding(p.source_of_funding) &&
          isAllianceProject(p) &&
          matchesPhase(p.phase, 2026),
      );

      expect(eligible.some((p) => p.id === 801)).toBe(false);
    });

    it('excludes projects from phase 2025 when target phase is 2026', () => {
      const eligible = productionFixture.filter(
        (p) =>
          isBilateralFunding(p.source_of_funding) &&
          isAllianceProject(p) &&
          matchesPhase(p.phase, 2026),
      );

      expect(eligible.some((p) => p.id === 901)).toBe(false);
    });
  });

  describe('Mixed-shape feed (coexistence of new-contract and legacy rows in one feed)', () => {
    const mixedFeed: ClarisaProject[] = [
      // New-contract row 1: CIAT
      {
        id: 1001,
        short_name: 'NEW-CIAT',
        source_of_funding: 'BILATERAL - RESTRICTED',
        source_center_acronym: 'CIAT',
        phase: 2026,
        lead_institution_object: {
          id: 99,
          name: 'Some Partner',
          acronym: 'OTHER',
        },
      },
      // New-contract row 2: BIOVERSITY
      {
        id: 1002,
        short_name: 'NEW-BIOVERSITY',
        source_of_funding: 'Bilateral - Restricted',
        source_center_acronym: 'BIOVERSITY',
        phase: '2026',
        lead_institution_object: null,
      },
      // New-contract row 3: padded ciat
      {
        id: 1003,
        short_name: 'NEW-ciat-PADDED',
        source_of_funding: 'BILATERAL- RESTRICTED',
        source_center_acronym: ' ciat ',
        phase: 2026,
      },
      // Legacy row 1: ABC lead
      {
        id: 2001,
        short_name: 'LEGACY-ABC',
        source_of_funding: 'Bilateral',
        lead_institution_object: {
          id: 1,
          name: 'Alliance',
          acronym: 'ABC',
        },
      },
      // Legacy row 2: ABC - Bioversity (Alliance)
      {
        id: 2002,
        short_name: 'LEGACY-ABC-LONG',
        source_of_funding: 'bilateral',
        lead_institution_object: {
          id: 1,
          name: 'Alliance',
          acronym: 'ABC - Bioversity (Alliance)',
        },
      },
      // Non-eligible: Non-Alliance centre
      {
        id: 3001,
        short_name: 'NON-ALLIANCE-CENTER',
        source_of_funding: 'Bilateral',
        source_center_acronym: 'IITA',
        phase: 2026,
      },
    ];

    it('resolves eligible projects across both branches in a single feed', () => {
      const eligible = mixedFeed.filter(
        (p) =>
          isBilateralFunding(p.source_of_funding) &&
          isAllianceProject(p) &&
          matchesPhase(p.phase, 2026),
      );

      expect(eligible.map((p) => p.id)).toEqual([1001, 1002, 1003, 2001, 2002]);
    });
  });
});
