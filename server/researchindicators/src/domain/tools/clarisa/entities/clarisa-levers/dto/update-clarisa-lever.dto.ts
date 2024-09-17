import { PartialType } from '@nestjs/swagger';
import { CreateClarisaLeverDto } from './create-clarisa-lever.dto';

export class UpdateClarisaLeverDto extends PartialType(CreateClarisaLeverDto) {}
