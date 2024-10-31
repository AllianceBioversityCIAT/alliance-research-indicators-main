import { ApiProperty } from '@nestjs/swagger';
import { ResultEvidence } from '../entities/result-evidence.entity';

export class CreateResultEvidenceDto {
  @ApiProperty({
    type: ResultEvidence,
    required: false,
    description: 'Is a reference to the indicator id',
    isArray: true,
  })
  evidence: ResultEvidence[];
}
