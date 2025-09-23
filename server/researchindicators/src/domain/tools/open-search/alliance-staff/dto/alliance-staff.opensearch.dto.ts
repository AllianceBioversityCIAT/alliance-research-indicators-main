import { OpenSearchProperty } from '../../decorators/opensearch-property.decorator';

export class AllianceStaffOpensearchDto {
  @OpenSearchProperty({
    type: 'keyword',
  })
  carnet!: string;

  @OpenSearchProperty({
    type: 'text',
  })
  first_name!: string;

  @OpenSearchProperty({
    type: 'text',
  })
  last_name!: string;

  @OpenSearchProperty({
    type: 'text',
  })
  email!: string;

  @OpenSearchProperty({
    type: 'keyword',
  })
  status?: string;

  @OpenSearchProperty({
    type: 'keyword',
  })
  center?: string;
}
