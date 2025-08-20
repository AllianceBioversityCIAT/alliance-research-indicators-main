import { ApiProperty } from '@nestjs/swagger';
import { LinkResult } from '../../link-results/entities/link-result.entity';
import { ResultTag } from '../../result-tags/entities/result-tag.entity';
import { ResultUser } from '../../result-users/entities/result-user.entity';

export class StepOneOicrDto {
  @ApiProperty({ type: ResultUser })
  main_contact_person: ResultUser;
  @ApiProperty({ type: [ResultTag] })
  tagging: ResultTag[];
  @ApiProperty({ type: [LinkResult] })
  linked_result: LinkResult[];
  @ApiProperty({
    type: String,
  })
  outcome_impact_statement: string;
}
