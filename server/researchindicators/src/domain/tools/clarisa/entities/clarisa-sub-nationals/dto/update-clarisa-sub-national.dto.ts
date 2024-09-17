import { PartialType } from '@nestjs/swagger';
import { CreateClarisaSubNationalDto } from './create-clarisa-sub-national.dto';

export class UpdateClarisaSubNationalDto extends PartialType(CreateClarisaSubNationalDto) {}
