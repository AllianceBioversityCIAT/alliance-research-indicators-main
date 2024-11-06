import { PartialType } from '@nestjs/swagger';
import { CreateLinkResultDto } from './create-link-result.dto';

export class UpdateLinkResultDto extends PartialType(CreateLinkResultDto) {}
