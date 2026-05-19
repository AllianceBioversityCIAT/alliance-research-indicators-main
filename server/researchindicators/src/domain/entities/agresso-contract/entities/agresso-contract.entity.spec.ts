import 'reflect-metadata';
import { getMetadataArgsStorage } from 'typeorm';
import { AgressoContract } from './agresso-contract.entity';
import { OpenSearchMetadataName } from '../../../tools/open-search/decorators/opensearch-property.decorator';

describe('AgressoContract entity metadata', () => {
  it('maps the Pool Funding Contributor flag to TypeORM metadata', () => {
    const column = getMetadataArgsStorage().columns.find(
      (metadata) =>
        metadata.target === AgressoContract &&
        metadata.propertyName === 'is_pool_funding_contributor',
    );

    expect(column?.options).toMatchObject({
      type: 'boolean',
      name: 'is_pool_funding_contributor',
      default: false,
      nullable: false,
    });
  });

  it('indexes the Pool Funding Contributor flag', () => {
    const index = getMetadataArgsStorage().indices.find(
      (metadata) =>
        metadata.target === AgressoContract &&
        metadata.name === 'idx_agresso_contract_pool_funding',
    );

    expect(index?.columns).toEqual(['is_pool_funding_contributor']);
  });

  it('exposes the Pool Funding Contributor flag to OpenSearch', () => {
    const openSearchMetadata = Reflect.getMetadata(
      OpenSearchMetadataName,
      AgressoContract,
    );

    expect(openSearchMetadata).toEqual(
      expect.arrayContaining([
        {
          propertyKey: 'is_pool_funding_contributor',
          options: { type: 'boolean' },
        },
      ]),
    );
  });
});
