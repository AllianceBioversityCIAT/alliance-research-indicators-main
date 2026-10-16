import { PartialType } from '@nestjs/swagger';
import { CreateResultInnovationUseDto } from './create-result-innovation-use.dto';

export class UpdateResultInnovationUseDto extends PartialType(
  CreateResultInnovationUseDto,
) {}
