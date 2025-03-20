import { PartialType } from '@nestjs/swagger';
import { CreateClarisaRegionDto } from './create-clarisa-region.dto';

export class UpdateClarisaRegionDto extends PartialType(
  CreateClarisaRegionDto,
) {}
