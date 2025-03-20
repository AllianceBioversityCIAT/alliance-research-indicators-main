import { PartialType } from '@nestjs/swagger';
import { CreateResultKeywordDto } from './create-result-keyword.dto';

export class UpdateResultKeywordDto extends PartialType(
  CreateResultKeywordDto,
) {}
