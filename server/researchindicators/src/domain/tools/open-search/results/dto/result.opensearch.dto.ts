import { OpenSearchProperty } from '../../decorators/opensearch-property.decorator';

export class ResultStatusOpensearchDto {
  @OpenSearchProperty({
    type: 'integer',
  })
  result_status_id!: number;

  @OpenSearchProperty({
    type: 'text',
  })
  name!: string;

  @OpenSearchProperty({
    type: 'text',
  })
  description!: string;
}

export class IndicatorOpensearchDto {
  @OpenSearchProperty({
    type: 'integer',
  })
  indicator_id!: number;

  @OpenSearchProperty({
    type: 'text',
  })
  name!: string;

  @OpenSearchProperty({
    type: 'text',
  })
  other_names?: string;

  @OpenSearchProperty({
    type: 'text',
  })
  description?: string;

  @OpenSearchProperty({
    type: 'text',
  })
  long_description?: string;

  @OpenSearchProperty({
    type: 'integer',
  })
  indicator_type_id!: number;

  @OpenSearchProperty({
    type: 'text',
  })
  icon_src?: string;
}

export class ResultOpensearchDto {
  @OpenSearchProperty({
    type: 'keyword',
  })
  result_id!: number;

  @OpenSearchProperty({
    type: 'keyword',
  })
  result_official_code!: number;

  @OpenSearchProperty({
    type: 'keyword',
  })
  version_id?: number;

  @OpenSearchProperty({
    type: 'text',
    fielddata: true,
  })
  title?: string;

  @OpenSearchProperty({
    type: 'text',
  })
  description?: string;

  @OpenSearchProperty({
    type: 'keyword',
  })
  indicator_id?: number;

  @OpenSearchProperty({
    type: 'keyword',
  })
  geo_scope_id?: number;

  @OpenSearchProperty({
    type: 'keyword',
  })
  report_year_id?: number;

  @OpenSearchProperty({
    type: 'keyword',
  })
  result_status_id?: number;

  @OpenSearchProperty({
    type: 'object',
    nestedType: ResultStatusOpensearchDto,
  })
  result_status!: ResultStatusOpensearchDto;

  @OpenSearchProperty({
    type: 'object',
    nestedType: IndicatorOpensearchDto,
  })
  indicator!: IndicatorOpensearchDto;

  @OpenSearchProperty({
    type: 'text',
  })
  keywords!: string[];
}
