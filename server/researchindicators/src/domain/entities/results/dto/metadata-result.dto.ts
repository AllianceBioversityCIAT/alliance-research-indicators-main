import { ApiProperty } from '@nestjs/swagger';

export class MetadataResultDto {
  @ApiProperty({
    type: Number,
    description: 'The id of the result',
    required: true,
  })
  result_id: number;

  @ApiProperty({
    type: Number,
    description: 'The unique code of the result',
    required: true,
  })
  result_official_code: number;

  @ApiProperty({
    type: Number,
    description: 'The indicator id',
    required: true,
  })
  indicator_id: number;

  @ApiProperty({
    type: String,
    description: 'The indicator name',
    required: true,
  })
  indicator_name: string;

  @ApiProperty({
    type: Number,
    description: 'The status id',
    required: true,
  })
  status_id: number;

  @ApiProperty({
    type: String,
    description: 'The status name',
    required: true,
  })
  status_name: string;

  @ApiProperty({
    type: String,
    description: 'The result title',
    required: true,
  })
  result_title: string;

  @ApiProperty({
    type: String,
    description: 'The created user',
    required: true,
  })
  created_by: number;

  @ApiProperty({
    type: Boolean,
    description: 'Is principal investigator',
    required: true,
  })
  is_principal_investigator: boolean;

  @ApiProperty({
    type: Number,
    description: 'The report year',
    required: true,
  })
  report_year: number;

  @ApiProperty({
    type: String,
    description: 'The result contract id',
    required: false,
  })
  result_contract_id: string;
}
