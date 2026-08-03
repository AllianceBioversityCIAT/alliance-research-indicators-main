// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-02 / R-BIL-091, R-BIL-097 (D-V2-3, D-V2-7)

import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import {
  MAPPABLE_LIVE_VERSION,
  allowedLevelsFor,
  resolveResultTypeKey,
} from './toc-level-rules.util';

describe('toc-level-rules.util', () => {
  describe('MAPPABLE_LIVE_VERSION (R-BIL-097, D-V2-7)', () => {
    it('is hardcoded to 2026', () => {
      expect(MAPPABLE_LIVE_VERSION).toBe(2026);
    });
  });

  describe('resolveResultTypeKey (R-BIL-091)', () => {
    it('maps CAPACITY_SHARING_FOR_DEVELOPMENT (1) to capacity_sharing', () => {
      expect(
        resolveResultTypeKey(IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT),
      ).toBe('capacity_sharing');
    });

    it('maps INNOVATION_DEV (2) to innovation_dev', () => {
      expect(resolveResultTypeKey(IndicatorsEnum.INNOVATION_DEV)).toBe(
        'innovation_dev',
      );
    });

    it('maps POLICY_CHANGE (4) to policy_change', () => {
      expect(resolveResultTypeKey(IndicatorsEnum.POLICY_CHANGE)).toBe(
        'policy_change',
      );
    });

    it('derives stable snake_case keys for the remaining enum members', () => {
      expect(resolveResultTypeKey(IndicatorsEnum.KNOWLEDGE_PRODUCT)).toBe(
        'knowledge_product',
      );
      expect(resolveResultTypeKey(IndicatorsEnum.OICR)).toBe('oicr');
      expect(resolveResultTypeKey(IndicatorsEnum.INNOVATION_USE)).toBe(
        'innovation_use',
      );
    });

    it('returns unknown for unrecognized ids', () => {
      expect(resolveResultTypeKey(999)).toBe('unknown');
      expect(resolveResultTypeKey(0)).toBe('unknown');
      expect(resolveResultTypeKey(-1)).toBe('unknown');
    });

    it('returns unknown for null/undefined ids', () => {
      expect(resolveResultTypeKey(null)).toBe('unknown');
      expect(resolveResultTypeKey(undefined)).toBe('unknown');
    });
  });

  describe('allowedLevelsFor (R-BIL-091, D-V2-3)', () => {
    it('capacity_sharing → [OUTPUT]', () => {
      expect(allowedLevelsFor('capacity_sharing')).toEqual(['OUTPUT']);
    });

    it('innovation_dev → [OUTPUT]', () => {
      expect(allowedLevelsFor('innovation_dev')).toEqual(['OUTPUT']);
    });

    it('policy_change → [OUTCOME, EOI]', () => {
      expect(allowedLevelsFor('policy_change')).toEqual(['OUTCOME', 'EOI']);
    });

    it('any other type → [] (pending OQ-V2-5)', () => {
      expect(allowedLevelsFor('knowledge_product')).toEqual([]);
      expect(allowedLevelsFor('oicr')).toEqual([]);
      expect(allowedLevelsFor('innovation_use')).toEqual([]);
      expect(allowedLevelsFor('unknown')).toEqual([]);
      expect(allowedLevelsFor('')).toEqual([]);
    });

    it('returns a fresh array each call (callers cannot mutate the rule table)', () => {
      const first = allowedLevelsFor('policy_change');
      first.pop();
      expect(allowedLevelsFor('policy_change')).toEqual(['OUTCOME', 'EOI']);
    });
  });
});
