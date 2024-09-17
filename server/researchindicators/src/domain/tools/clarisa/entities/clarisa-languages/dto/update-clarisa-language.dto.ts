import { PartialType } from '@nestjs/swagger';
import { CreateClarisaLanguageDto } from './create-clarisa-language.dto';

export class UpdateClarisaLanguageDto extends PartialType(CreateClarisaLanguageDto) {}
