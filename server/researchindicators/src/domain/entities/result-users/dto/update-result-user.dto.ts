import { PartialType } from '@nestjs/swagger';
import { CreateResultUserDto } from './create-result-user.dto';

export class UpdateResultUserDto extends PartialType(CreateResultUserDto) {}
