import { getMetadataArgsStorage } from 'typeorm';
import { ResultPoolFundingAlignment } from './result-pool-funding-alignment.entity';

describe('ResultPoolFundingAlignment entity metadata', () => {
  it('maps the alignment fields to TypeORM metadata', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (metadata) => metadata.target === ResultPoolFundingAlignment,
    );

    expect(
      columns.find((metadata) => metadata.propertyName === 'result_id')
        ?.options,
    ).toMatchObject({
      type: 'bigint',
      name: 'result_id',
      nullable: false,
    });
    expect(
      columns.find((metadata) => metadata.propertyName === 'has_contribution')
        ?.options,
    ).toMatchObject({
      type: 'boolean',
      name: 'has_contribution',
      nullable: false,
    });
  });

  it('enforces one active alignment per result', () => {
    const index = getMetadataArgsStorage().indices.find(
      (metadata) =>
        metadata.target === ResultPoolFundingAlignment &&
        metadata.name === 'uq_result_pool_funding_alignment_result_active',
    );

    expect(index?.columns).toEqual(['result_id', 'is_active']);
    expect(index?.unique).toBe(true);
  });
});
