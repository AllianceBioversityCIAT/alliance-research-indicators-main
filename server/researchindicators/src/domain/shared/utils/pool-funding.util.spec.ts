import { effectivePoolFundingContributorSql } from './pool-funding.util';

describe('pool-funding.util', () => {
  describe('effectivePoolFundingContributorSql', () => {
    it('should return the exact predicate for the default alias', () => {
      expect(effectivePoolFundingContributorSql('ac')).toMatchInlineSnapshot(`
        "(
          COALESCE(ac.is_pool_funding_contributor, 0) = 1
          OR EXISTS (
            SELECT 1 FROM bilateral_project_mapping bpm
            WHERE bpm.agresso_agreement_id = ac.agreement_id
              AND bpm.is_active = 1
          )
        )"
      `);
    });

    it('should parameterize the alias', () => {
      const sql = effectivePoolFundingContributorSql('contract');
      expect(sql).toContain(
        'COALESCE(contract.is_pool_funding_contributor, 0) = 1',
      );
      expect(sql).toContain(
        'WHERE bpm.agresso_agreement_id = contract.agreement_id',
      );
      expect(sql).not.toContain('ac.');
    });
  });
});
