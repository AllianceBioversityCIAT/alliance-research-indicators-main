import { OpenSearchProperty } from '../../decorators/opensearch-property.decorator';

export class AgressoContractOpensearchDto {
  @OpenSearchProperty({
    type: 'keyword',
  })
  agreement_id!: string;

  @OpenSearchProperty({
    type: 'text',
    fielddata: true,
  })
  projectDescription?: string;

  @OpenSearchProperty({
    type: 'text',
  })
  project_lead_description?: string;

  @OpenSearchProperty({
    type: 'text',
  })
  description?: string;

  @OpenSearchProperty({
    type: 'keyword',
  })
  funding_type?: string;

  @OpenSearchProperty({
    type: 'keyword',
  })
  contract_status?: string;

  @OpenSearchProperty({
    type: 'boolean',
  })
  is_pool_funding_contributor!: boolean;
}
