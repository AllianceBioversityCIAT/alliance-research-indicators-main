import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { OpenSearchMetadataName } from '../../../tools/open-search/decorators/opensearch-property.decorator';
import { ResultPoolFundingAlignmentSp } from './result-pool-funding-alignment-sp.entity';

describe('ResultPoolFundingAlignmentSp entity metadata', () => {
  it('maps the SP selection fields to TypeORM metadata', () => {
    const columns = getMetadataArgsStorage().columns.filter(
      (metadata) => metadata.target === ResultPoolFundingAlignmentSp,
    );

    expect(
      columns.find((metadata) => metadata.propertyName === 'alignment_id')
        ?.options,
    ).toMatchObject({
      type: 'bigint',
      name: 'alignment_id',
      nullable: false,
    });
    expect(
      columns.find((metadata) => metadata.propertyName === 'lever_code')
        ?.options,
    ).toMatchObject({
      type: 'varchar',
      name: 'lever_code',
      length: 50,
      nullable: false,
    });
  });

  it('exposes lever_code to OpenSearch', () => {
    const openSearchMetadata = Reflect.getMetadata(
      OpenSearchMetadataName,
      ResultPoolFundingAlignmentSp,
    );

    expect(openSearchMetadata).toEqual(
      expect.arrayContaining([
        {
          propertyKey: 'lever_code',
          options: { type: 'keyword' },
        },
      ]),
    );
  });
});
