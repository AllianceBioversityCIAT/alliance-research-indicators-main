import { ApiProperty } from '@nestjs/swagger';
import { ResultTag } from '../../result-tags/entities/result-tag.entity';
import { ResultUser } from '../../result-users/entities/result-user.entity';
import { TempResultExternalOicr } from '../../temp_external_oicrs/entities/temp_result_external_oicr.entity';

export class StepOneOicrDto {
  @ApiProperty({ type: ResultUser })
  main_contact_person: ResultUser;
  @ApiProperty({ type: ResultTag })
  tagging: ResultTag;
  @ApiProperty({ type: TempResultExternalOicr })
  link_result: Partial<TempResultExternalOicr>;
  @ApiProperty({
    type: String,
  })
  outcome_impact_statement: string;
}
