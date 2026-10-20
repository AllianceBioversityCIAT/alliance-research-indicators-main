import { TipProjectDto, TipTocMappingDto } from '../dto/response-year-tip.dto';
import { mapTipProjects, TipProjectsLogger } from './tip-projects.mapper';

const TIP_ID = 19191;

const SAMPLE_INDICATOR_UUID = 'f3706ba2-4c3e-4f1a-9b2d-0e1f2a3b4c5d';

const a132Mapping: TipTocMappingDto = {
  science_program_id: 'SP01',
  aow_compose_code: 'AOW1',
  toc_result_id: 7033,
  toc_internal_id: 'HLO1.AOW1.IO1',
  result_title: 'HLO1.AOW1.IO1 Steer to impact',
  toc_result_indicator_id: SAMPLE_INDICATOR_UUID,
  result_indicator_description: 'Steer to impact',
  result_indicator_type_name: 'Number',
  target_contribution: 1,
};

const a171Mapping: TipTocMappingDto = {
  science_program_id: 'SP02',
  toc_result_id: 8001,
  result_title: 'Decoy mapping',
  toc_result_indicator_id: SAMPLE_INDICATOR_UUID,
  target_contribution: 2,
};

const known = new Set(['A132', 'A171', 'A1824']);

const project = (
  agreementId: string,
  flags: Partial<TipProjectDto> = {},
): TipProjectDto => ({
  agreement_id: agreementId,
  description: agreementId,
  ...flags,
});

const warnLogger = (): TipProjectsLogger & { warn: jest.Mock } => ({
  warn: jest.fn(),
});

describe('mapTipProjects', () => {
  it('saves three projects and keeps only the flagged primary, with its pool funding', () => {
    const logger = warnLogger();
    const result = mapTipProjects(
      [
        project('A132', {
          is_primary: true,
          is_contributing_to_pool_funding: true,
          toc_mapping: a132Mapping,
        }),
        project('A171', {
          is_primary: false,
          is_contributing_to_pool_funding: true,
          toc_mapping: a171Mapping,
        }),
        project('A1824', { is_primary: false }),
      ],
      known,
      TIP_ID,
      logger,
    );

    expect(result.contracts).toEqual([
      { contract_id: 'A132', is_primary: true },
      { contract_id: 'A171', is_primary: false },
      { contract_id: 'A1824', is_primary: false },
    ]);
    expect(result.contracts.filter((item) => item.is_primary)).toHaveLength(1);
    expect(result.createContractId).toBe('A132');
    expect(result.poolFunding).toEqual(a132Mapping);
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('keeps exactly one primary when two projects are flagged', () => {
    const logger = warnLogger();
    const result = mapTipProjects(
      [
        project('A171', {
          is_primary: true,
          is_contributing_to_pool_funding: true,
          toc_mapping: a171Mapping,
        }),
        project('A132', {
          is_primary: true,
          is_contributing_to_pool_funding: true,
          toc_mapping: a132Mapping,
        }),
      ],
      known,
      TIP_ID,
      logger,
    );

    expect(result.contracts.filter((item) => item.is_primary)).toHaveLength(1);
    expect(result.contracts).toEqual([
      { contract_id: 'A171', is_primary: true },
      { contract_id: 'A132', is_primary: false },
    ]);
    expect(result.createContractId).toBe('A171');
    expect(result.poolFunding).toEqual(a171Mapping);
  });

  it('treats a legacy single object without flags as the only primary', () => {
    const logger = warnLogger();
    const result = mapTipProjects(
      { agreement_id: 'A132', description: 'legacy' },
      known,
      TIP_ID,
      logger,
    );

    expect(result.contracts).toEqual([
      { contract_id: 'A132', is_primary: true },
    ]);
    expect(result.createContractId).toBe('A132');
    expect(result.poolFunding).toBeNull();
  });

  it('promotes the first known project when a legacy payload does not flag a primary', () => {
    const logger = warnLogger();
    const result = mapTipProjects(
      [project('ZZ999'), project('A171')],
      known,
      TIP_ID,
      logger,
    );

    expect(result.contracts).toEqual([
      { contract_id: 'A171', is_primary: true },
    ]);
    expect(result.createContractId).toBe('A171');
    expect(result.poolFunding).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      'TIP 19191: agreement ZZ999 not found in agresso_contracts, contract skipped',
    );
    expect(logger.warn).not.toHaveBeenCalledWith(
      'TIP 19191: flagged primary ZZ999 unknown, no primary contract',
    );
  });

  it('drops an unknown non-primary project and warns with its agreement id', () => {
    const logger = warnLogger();
    const result = mapTipProjects(
      [
        project('A132', {
          is_primary: true,
          is_contributing_to_pool_funding: true,
          toc_mapping: a132Mapping,
        }),
        project('ZZ999'),
      ],
      known,
      TIP_ID,
      logger,
    );

    expect(result.contracts).toEqual([
      { contract_id: 'A132', is_primary: true },
    ]);
    expect(result.createContractId).toBe('A132');
    expect(result.poolFunding).toEqual(a132Mapping);
    expect(logger.warn).toHaveBeenCalledWith(
      'TIP 19191: agreement ZZ999 not found in agresso_contracts, contract skipped',
    );
  });

  it('does not promote another project when the flagged primary is unknown', () => {
    const logger = warnLogger();
    const result = mapTipProjects(
      [
        project('ZZ999', {
          is_primary: true,
          is_contributing_to_pool_funding: true,
          toc_mapping: a132Mapping,
        }),
        project('A171', {
          is_primary: false,
          is_contributing_to_pool_funding: true,
          toc_mapping: a171Mapping,
        }),
      ],
      known,
      TIP_ID,
      logger,
    );

    expect(result.contracts).toEqual([
      { contract_id: 'A171', is_primary: false },
    ]);
    expect(result.contracts.filter((item) => item.is_primary)).toHaveLength(0);
    expect(result.createContractId).toBe('A171');
    expect(result.poolFunding).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      'TIP 19191: flagged primary ZZ999 unknown, no primary contract',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'TIP 19191: agreement ZZ999 not found in agresso_contracts, contract skipped',
    );
  });

  it('saves a repeated agreement id once and keeps the first occurrence flag', () => {
    const logger = warnLogger();
    const result = mapTipProjects(
      [
        project('', { is_primary: true }),
        project('A132', { is_primary: true }),
        project('A132', { is_primary: false }),
      ],
      known,
      TIP_ID,
      logger,
    );

    expect(result.contracts).toEqual([
      { contract_id: 'A132', is_primary: true },
    ]);

    const laterFlagDiscarded = mapTipProjects(
      [
        project('A171'),
        project('A132', { is_primary: false }),
        project('A132', { is_primary: true }),
      ],
      known,
      TIP_ID,
      logger,
    );
    expect(laterFlagDiscarded.contracts).toEqual([
      { contract_id: 'A171', is_primary: true },
      { contract_id: 'A132', is_primary: false },
    ]);
    expect(laterFlagDiscarded.createContractId).toBe('A171');
  });

  it.each([null, [] as TipProjectDto[]])(
    'returns no contracts when project is %p',
    (input) => {
      const logger = warnLogger();
      const result = mapTipProjects(input, known, TIP_ID, logger);

      expect(result.contracts).toEqual([]);
      expect(result.createContractId).toBeNull();
      expect(result.poolFunding).toBeNull();
      expect(logger.warn).not.toHaveBeenCalled();
    },
  );

  it('warns with the TIP id when no project is known', () => {
    const logger = warnLogger();
    const result = mapTipProjects(
      [project('ZZ999'), project('YY888')],
      new Set(['A132']),
      TIP_ID,
      logger,
    );

    expect(result.contracts).toEqual([]);
    expect(result.createContractId).toBeNull();
    expect(result.poolFunding).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      'TIP 19191: agreement ZZ999 not found in agresso_contracts, contract skipped',
    );
    expect(logger.warn).toHaveBeenCalledWith(
      'TIP 19191: agreement YY888 not found in agresso_contracts, contract skipped',
    );
  });

  it('returns null pool funding when the primary is not contributing', () => {
    const logger = warnLogger();
    const result = mapTipProjects(
      [
        project('A132', {
          is_primary: true,
          is_contributing_to_pool_funding: false,
          toc_mapping: a132Mapping,
        }),
      ],
      known,
      TIP_ID,
      logger,
    );

    expect(result.contracts).toEqual([
      { contract_id: 'A132', is_primary: true },
    ]);
    expect(result.poolFunding).toBeNull();
  });

  it('returns null pool funding when the contributing primary has a null mapping', () => {
    const result = mapTipProjects(
      [
        project('A132', {
          is_primary: true,
          is_contributing_to_pool_funding: true,
          toc_mapping: null,
        }),
      ],
      known,
      TIP_ID,
      warnLogger(),
    );

    expect(result.poolFunding).toBeNull();
    expect(result.createContractId).toBe('A132');
  });

  it('returns null pool funding when the mapping has no science program id', () => {
    const mappingWithoutProgram: TipTocMappingDto = {
      toc_result_id: 7033,
      result_title: 'HLO1.AOW1.IO1 Steer to impact',
      toc_result_indicator_id: SAMPLE_INDICATOR_UUID,
      target_contribution: 1,
    };
    const result = mapTipProjects(
      [
        project('A132', {
          is_primary: true,
          is_contributing_to_pool_funding: true,
          toc_mapping: mappingWithoutProgram,
        }),
      ],
      known,
      TIP_ID,
      warnLogger(),
    );

    expect(result.poolFunding).toBeNull();
    expect(result.contracts).toEqual([
      { contract_id: 'A132', is_primary: true },
    ]);
  });
});
