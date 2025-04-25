import { DeepPartial } from 'typeorm';
import {
  CountryOfficeDTO,
  CreateClarisaInstitutionDto,
} from '../entities/clarisa-institutions/dto/create-clarisa-institution.dto';
import { ClarisaInstitution } from '../entities/clarisa-institutions/entities/clarisa-institution.entity';
import { ClarisaInstitutionLocation } from '../entities/clarisa-institution-locations/entities/clarisa-institution-location.entity';

export const institutionMapper = (
  data: CreateClarisaInstitutionDto,
): DeepPartial<ClarisaInstitution> => ({
  acronym: data?.acronym,
  added: data?.added,
  code: data.code,
  name: data?.name,
  websiteLink: data?.websiteLink,
  institution_type_id: data?.institutionType?.code,
  institution_locations: hqInstitutionsMapper(data.countryOfficeDTO),
});

const hqInstitutionsMapper = (
  hq: CountryOfficeDTO[],
): Partial<ClarisaInstitutionLocation>[] => {
  return hq.map(
    (hq): Partial<ClarisaInstitutionLocation> => ({
      code: hq.code,
      name: hq.name,
      isoAlpha2: hq.isoAlpha2,
      isHeadquarter: hq.isHeadquarter == 1,
    }),
  );
};
