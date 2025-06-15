import { PartialType } from '@nestjs/swagger';
import { CreateClarisaActorTypeDto } from './create-clarisa-actor-type.dto';

export class UpdateClarisaActorTypeDto extends PartialType(
  CreateClarisaActorTypeDto,
) {}
