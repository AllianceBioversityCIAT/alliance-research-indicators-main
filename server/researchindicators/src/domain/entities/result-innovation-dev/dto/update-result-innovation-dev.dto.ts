import { PartialType } from '@nestjs/swagger';
import { CreateResultInnovationDevDto } from './create-result-innovation-dev.dto';

export class UpdateResultInnovationDevDto extends PartialType(
  CreateResultInnovationDevDto,
) {}
