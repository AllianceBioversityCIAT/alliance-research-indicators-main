import { PartialType } from '@nestjs/swagger';
import { CreateResultCountriesSubNationalDto } from './create-result-countries-sub-national.dto';

export class UpdateResultCountriesSubNationalDto extends PartialType(CreateResultCountriesSubNationalDto) {}
