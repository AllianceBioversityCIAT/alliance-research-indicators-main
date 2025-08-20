import { PartialType } from '@nestjs/swagger';
import { CreateResultTagDto } from './create-result-tag.dto';

export class UpdateResultTagDto extends PartialType(CreateResultTagDto) {}
