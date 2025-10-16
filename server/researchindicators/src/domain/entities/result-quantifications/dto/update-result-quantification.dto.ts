import { PartialType } from '@nestjs/swagger';
import { CreateResultQuantificationDto } from './create-result-quantification.dto';

export class UpdateResultQuantificationDto extends PartialType(
  CreateResultQuantificationDto,
) {}
