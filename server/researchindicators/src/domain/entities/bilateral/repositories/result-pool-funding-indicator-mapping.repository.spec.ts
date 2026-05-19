import { DataSource } from 'typeorm';
import { ResultPoolFundingIndicatorMappingRepository } from './result-pool-funding-indicator-mapping.repository';

describe('ResultPoolFundingIndicatorMappingRepository', () => {
  it('finds active mappings by result, lever, and indicator', async () => {
    const repository = new ResultPoolFundingIndicatorMappingRepository({
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource);
    const findOne = jest.spyOn(repository, 'findOne').mockResolvedValue({
      id: 1,
      result_id: 77,
      lever_code: 'SP01',
      indicator_code: 'IND-1',
      indicator_type: 'capacity_sharing',
      is_stale: false,
    } as any);

    await expect(
      repository.findActiveMappingByResultLeverIndicator(77, 'SP01', 'IND-1'),
    ).resolves.toMatchObject({ id: 1 });
    expect(findOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          result_id: 77,
          lever_code: 'SP01',
          indicator_code: 'IND-1',
          is_active: true,
        },
      }),
    );
  });

  it('finds active stale mappings by result and selected levers', async () => {
    const repository = new ResultPoolFundingIndicatorMappingRepository({
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource);
    const find = jest.spyOn(repository, 'find').mockResolvedValue([
      {
        id: 1,
        result_id: 77,
        lever_code: 'SP01',
        indicator_code: 'IND-1',
        indicator_type: 'capacity_sharing',
        is_stale: true,
      } as any,
    ]);

    await expect(
      repository.findActiveStaleMappingsByResultAndLevers(77, ['SP01', 'SP02']),
    ).resolves.toHaveLength(1);
    expect(find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          result_id: 77,
          is_active: true,
          is_stale: true,
        }),
        order: {
          lever_code: 'ASC',
          indicator_code: 'ASC',
        },
      }),
    );
  });

  it('does not query stale mappings when no levers are selected', async () => {
    const repository = new ResultPoolFundingIndicatorMappingRepository({
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource);
    const find = jest.spyOn(repository, 'find');

    await expect(
      repository.findActiveStaleMappingsByResultAndLevers(77, []),
    ).resolves.toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });

  it('marks active non-stale mappings stale by lever and indicator', async () => {
    const repository = new ResultPoolFundingIndicatorMappingRepository({
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource);
    const update = jest.spyOn(repository, 'update').mockResolvedValue({
      affected: 2,
      generatedMaps: [],
      raw: [],
    });

    await expect(
      repository.markActiveMappingsStaleByLeverIndicator('SP01', 'IND-1', 9),
    ).resolves.toBe(2);
    expect(update).toHaveBeenCalledWith(
      {
        lever_code: 'SP01',
        indicator_code: 'IND-1',
        is_active: true,
        is_stale: false,
      },
      {
        is_stale: true,
        updated_by: 9,
      },
    );
  });
});
