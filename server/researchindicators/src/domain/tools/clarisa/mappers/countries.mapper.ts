import { DeepPartial } from 'typeorm';
import { CreateClarisaCountryDto } from '../entities/clarisa-countries/dto/create-clarisa-country.dto';
import { ClarisaCountry } from '../entities/clarisa-countries/entities/clarisa-country.entity';

export const countryMapper = (
  data: CreateClarisaCountryDto,
): DeepPartial<ClarisaCountry> => ({
  isoAlpha2: data?.isoAlpha2,
  isoAlpha3: data?.isoAlpha3,
  name: data?.name,
  latitude: data?.locationDTO?.latitude,
  longitude: data?.locationDTO?.longitude,
});
