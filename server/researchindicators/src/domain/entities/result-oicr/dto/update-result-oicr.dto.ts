import { PartialType } from '@nestjs/swagger';
import { CreateResultOicrDto } from './create-result-oicr.dto';

export class UpdateResultOicrDto extends PartialType(CreateResultOicrDto) {}
