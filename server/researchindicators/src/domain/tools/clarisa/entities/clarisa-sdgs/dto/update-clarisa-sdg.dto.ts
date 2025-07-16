import { PartialType } from '@nestjs/swagger';
import { CreateClarisaSdgDto } from './create-clarisa-sdg.dto';

export class UpdateClarisaSdgDto extends PartialType(CreateClarisaSdgDto) {}
