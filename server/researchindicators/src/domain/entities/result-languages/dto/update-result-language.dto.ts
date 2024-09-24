import { PartialType } from '@nestjs/swagger';
import { CreateResultLanguageDto } from './create-result-language.dto';

export class UpdateResultLanguageDto extends PartialType(
  CreateResultLanguageDto,
) {}
