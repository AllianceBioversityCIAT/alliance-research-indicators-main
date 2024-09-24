import { PartialType } from '@nestjs/swagger';
import { CreateResultCountryDto } from './create-result-country.dto';

export class UpdateResultCountryDto extends PartialType(
  CreateResultCountryDto,
) {}
