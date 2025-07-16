import { PartialType } from '@nestjs/swagger';
import { CreateClarisaInnovationCharacteristicDto } from './create-clarisa-innovation-characteristic.dto';

export class UpdateClarisaInnovationCharacteristicDto extends PartialType(
  CreateClarisaInnovationCharacteristicDto,
) {}
