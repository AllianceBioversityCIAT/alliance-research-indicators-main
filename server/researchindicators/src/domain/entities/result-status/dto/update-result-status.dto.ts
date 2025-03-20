import { PartialType } from '@nestjs/swagger';
import { CreateResultStatusDto } from './create-result-status.dto';

export class UpdateResultStatusDto extends PartialType(CreateResultStatusDto) {}
