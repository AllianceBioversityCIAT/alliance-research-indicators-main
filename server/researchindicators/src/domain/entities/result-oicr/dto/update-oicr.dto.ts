import { ApiProperty } from '@nestjs/swagger';
import { ResultTag } from '../../result-tags/entities/result-tag.entity';
import { TempResultExternalOicr } from '../../temp_external_oicrs/entities/temp_result_external_oicr.entity';

export class UpdateOicrDto {
  @ApiProperty({
    type: String,
  })
  oicr_internal_code: string;

  @ApiProperty({ type: [ResultTag] })
  tagging: ResultTag[];

  @ApiProperty({
    type: String,
  })
  outcome_impact_statement: string;

  @ApiProperty({
    type: String,
  })
  short_outcome_impact_statement: string;

  @ApiProperty({
    type: String,
  })
  general_comment: string;

  @ApiProperty({
    type: Number,
  })
  maturity_level_id: number;

  @ApiProperty({ type: [TempResultExternalOicr] })
  link_result: Partial<TempResultExternalOicr>[];
}
