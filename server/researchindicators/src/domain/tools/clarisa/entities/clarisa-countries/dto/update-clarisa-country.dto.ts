import { PartialType } from '@nestjs/swagger';
import { CreateClarisaCountryDto } from './create-clarisa-country.dto';

export class UpdateClarisaCountryDto extends PartialType(CreateClarisaCountryDto) {}
