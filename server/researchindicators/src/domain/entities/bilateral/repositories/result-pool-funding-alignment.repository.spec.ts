import { DataSource } from 'typeorm';
import { ResultPoolFundingAlignmentRepository } from './result-pool-funding-alignment.repository';

describe('ResultPoolFundingAlignmentRepository', () => {
  let repository: ResultPoolFundingAlignmentRepository;
  let querySpy: jest.SpyInstance;

  beforeEach(() => {
    repository = new ResultPoolFundingAlignmentRepository({
      createEntityManager: jest.fn().mockReturnValue({}),
    } as unknown as DataSource);
    querySpy = jest.spyOn(repository, 'query').mockResolvedValue([] as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns null when there is no active alignment', async () => {
    await expect(
      repository.findActiveAlignmentByResultId(77),
    ).resolves.toBeNull();
    expect(querySpy).toHaveBeenCalledWith(expect.any(String), [77]);
  });

  it('maps active alignment rows with selected lever names', async () => {
    querySpy.mockResolvedValue([
      {
        id: '5',
        result_id: '77',
        has_contribution: '1',
        lever_code: 'SP01',
        lever_name: 'Adaptive crops',
      },
      {
        id: '5',
        result_id: '77',
        has_contribution: '1',
        lever_code: 'SP02',
        lever_name: null,
      },
    ]);

    await expect(repository.findActiveAlignmentByResultId(77)).resolves.toEqual(
      {
        id: 5,
        result_id: 77,
        has_contribution: true,
        selected_levers: [
          { lever_code: 'SP01', lever_name: 'Adaptive crops' },
          { lever_code: 'SP02', lever_name: 'SP02' },
        ],
      },
    );
  });

  it('keeps selected levers empty when alignment has no active SP rows', async () => {
    querySpy.mockResolvedValue([
      {
        id: 5,
        result_id: 77,
        has_contribution: 0,
        lever_code: null,
        lever_name: null,
      },
    ]);

    await expect(repository.findActiveAlignmentByResultId(77)).resolves.toEqual(
      {
        id: 5,
        result_id: 77,
        has_contribution: false,
        selected_levers: [],
      },
    );
  });

  it('joins alignment SP rows and CLARISA levers', async () => {
    await repository.findActiveAlignmentByResultId(77);
    const sql = querySpy.mock.calls[0][0] as string;

    expect(sql).toContain('FROM result_pool_funding_alignment rpfa');
    expect(sql).toContain('LEFT JOIN result_pool_funding_alignment_sp rpfas');
    expect(sql).toContain('LEFT JOIN clarisa_levers cl');
  });
});
