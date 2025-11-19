import { ApiProperty } from '@nestjs/swagger';
import { ResultEvidence } from '../entities/result-evidence.entity';
import { ResultNotableReference } from '../../result-notable-references/entities/result-notable-reference.entity';

export class CreateResultEvidenceDto {
  @ApiProperty({
    type: ResultEvidence,
    required: false,
    description: 'Is a reference to the indicator id',
    isArray: true,
  })
  evidence: ResultEvidence[];

  @ApiProperty({ type: [ResultNotableReference] })
  notable_references?: ResultNotableReference[];
}
