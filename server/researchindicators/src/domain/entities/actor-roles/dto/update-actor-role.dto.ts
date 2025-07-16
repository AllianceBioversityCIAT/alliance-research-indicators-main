import { PartialType } from '@nestjs/swagger';
import { CreateActorRoleDto } from './create-actor-role.dto';

export class UpdateActorRoleDto extends PartialType(CreateActorRoleDto) {}
