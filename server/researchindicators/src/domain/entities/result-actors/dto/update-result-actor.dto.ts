import { PartialType } from '@nestjs/swagger';
import { CreateResultActorDto } from './create-result-actor.dto';

export class UpdateResultActorDto extends PartialType(CreateResultActorDto) {}
