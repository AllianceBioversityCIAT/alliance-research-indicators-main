// @sdd-spec docs/specs/bugfix/pool-funding-sp-picker-empty — T-02 / R-PSP-001, R-PSP-003, D-PSP-2

import {
  DEFAULT_ACCEPTED_SP_STATUSES,
  DEFAULT_ACCEPTED_SP_STATUS_SET,
  isAcceptedSpStatus,
  isProjectScienceProgramMapping,
  parseAcceptedSpStatuses,
} from './sp-mapping.predicate';
import { ENV } from '../../../shared/utils/env.utils';

describe('sp-mapping.predicate', () => {
  describe('isAcceptedSpStatus', () => {
    it('accepts Confirmed and Pending by default', () => {
      expect(DEFAULT_ACCEPTED_SP_STATUS_SET.has('Confirmed')).toBe(true);
      expect(DEFAULT_ACCEPTED_SP_STATUS_SET.has('Pending')).toBe(true);
      expect(isAcceptedSpStatus('Confirmed')).toBe(true);
      expect(isAcceptedSpStatus('Pending')).toBe(true);
      expect(isAcceptedSpStatus('  Confirmed  ')).toBe(true);
      expect(isAcceptedSpStatus('  Pending  ')).toBe(true);
    });

    it('rejects Draft, Rejected, and null/undefined/empty by default', () => {
      expect(isAcceptedSpStatus('Draft')).toBe(false);
      expect(isAcceptedSpStatus('Rejected')).toBe(false);
      expect(isAcceptedSpStatus(null)).toBe(false);
      expect(isAcceptedSpStatus(undefined)).toBe(false);
      expect(isAcceptedSpStatus('')).toBe(false);
      expect(isAcceptedSpStatus('   ')).toBe(false);
    });

    it('respects custom accepted status sets', () => {
      const customSet = new Set(['Confirmed']);
      expect(isAcceptedSpStatus('Confirmed', customSet)).toBe(true);
      expect(isAcceptedSpStatus('Pending', customSet)).toBe(false);
    });
  });

  describe('isProjectScienceProgramMapping', () => {
    const validPendingRow = {
      status: 'Pending',
      global_unit_object: {
        smo_code: 'SP01',
        name: 'Multifunctional Landscapes',
        cgiar_entity_type_object: { prefix: 'SP', code: 22 },
        portfolio_object: { acronym: 'P25' },
      },
    };

    it('returns true for a valid Pending mapping in active portfolio P25', () => {
      expect(isProjectScienceProgramMapping(validPendingRow, 'P25')).toBe(true);
    });

    it('returns true for a valid Confirmed mapping in active portfolio P25', () => {
      const confirmedRow = { ...validPendingRow, status: 'Confirmed' };
      expect(isProjectScienceProgramMapping(confirmedRow, 'P25')).toBe(true);
    });

    it('returns false when status is Rejected or Draft', () => {
      expect(
        isProjectScienceProgramMapping(
          { ...validPendingRow, status: 'Rejected' },
          'P25',
        ),
      ).toBe(false);
      expect(
        isProjectScienceProgramMapping(
          { ...validPendingRow, status: 'Draft' },
          'P25',
        ),
      ).toBe(false);
    });

    it('returns false when portfolio does not match active portfolio', () => {
      const p22Row = {
        ...validPendingRow,
        global_unit_object: {
          ...validPendingRow.global_unit_object,
          portfolio_object: { acronym: 'P22' },
        },
      };
      expect(isProjectScienceProgramMapping(p22Row, 'P25')).toBe(false);
    });

    it('returns false when prefix is AOW', () => {
      const aowRow = {
        ...validPendingRow,
        global_unit_object: {
          ...validPendingRow.global_unit_object,
          cgiar_entity_type_object: { prefix: 'AOW', code: 26 },
        },
      };
      expect(isProjectScienceProgramMapping(aowRow, 'P25')).toBe(false);
    });

    it('returns false when smo_code does not match /^SP\\d/i', () => {
      const nonSpRow = {
        ...validPendingRow,
        global_unit_object: {
          ...validPendingRow.global_unit_object,
          smo_code: 'INIT01',
        },
      };
      expect(isProjectScienceProgramMapping(nonSpRow, 'P25')).toBe(false);
    });

    it('returns false for null or undefined mapping', () => {
      expect(isProjectScienceProgramMapping(null, 'P25')).toBe(false);
      expect(isProjectScienceProgramMapping(undefined, 'P25')).toBe(false);
    });
  });

  describe('parseAcceptedSpStatuses', () => {
    it('returns default set when raw input is unset, null, empty, or whitespace', () => {
      expect(parseAcceptedSpStatuses(undefined)).toEqual(
        new Set(['Confirmed', 'Pending']),
      );
      expect(parseAcceptedSpStatuses(null)).toEqual(
        new Set(['Confirmed', 'Pending']),
      );
      expect(parseAcceptedSpStatuses('')).toEqual(
        new Set(['Confirmed', 'Pending']),
      );
      expect(parseAcceptedSpStatuses('   ')).toEqual(
        new Set(['Confirmed', 'Pending']),
      );
    });

    it('parses comma-separated string tokens and trims whitespace', () => {
      expect(
        parseAcceptedSpStatuses('Confirmed, Pending, Under Review'),
      ).toEqual(new Set(['Confirmed', 'Pending', 'Under Review']));
      expect(parseAcceptedSpStatuses('Confirmed')).toEqual(
        new Set(['Confirmed']),
      );
    });

    it('ENV.BILATERAL_ACCEPTED_SP_STATUSES derives its default from DEFAULT_ACCEPTED_SP_STATUSES when env is unset', () => {
      const originalEnv = process.env.ARI_BILATERAL_ACCEPTED_SP_STATUSES;
      try {
        delete process.env.ARI_BILATERAL_ACCEPTED_SP_STATUSES;
        expect(ENV.BILATERAL_ACCEPTED_SP_STATUSES).toEqual(
          new Set(DEFAULT_ACCEPTED_SP_STATUSES),
        );
      } finally {
        if (originalEnv !== undefined) {
          process.env.ARI_BILATERAL_ACCEPTED_SP_STATUSES = originalEnv;
        }
      }
    });
  });
});
