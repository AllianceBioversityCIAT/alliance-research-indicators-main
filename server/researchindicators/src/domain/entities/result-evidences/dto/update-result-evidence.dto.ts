import { PartialType } from '@nestjs/swagger';
import { CreateResultEvidenceDto } from './create-result-evidence.dto';

export class UpdateResultEvidenceDto extends PartialType(CreateResultEvidenceDto) {}
