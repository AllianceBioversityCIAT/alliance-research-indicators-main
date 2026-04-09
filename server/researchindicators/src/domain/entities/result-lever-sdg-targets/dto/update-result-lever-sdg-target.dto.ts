import { PartialType } from '@nestjs/swagger';
import { CreateResultLeverSdgTargetDto } from './create-result-lever-sdg-target.dto';

export class UpdateResultLeverSdgTargetDto extends PartialType(
  CreateResultLeverSdgTargetDto,
) {}
