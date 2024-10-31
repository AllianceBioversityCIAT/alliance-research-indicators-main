import { DeepPartial } from 'typeorm';
import {
  countryOfficeDTO,
  CreateClarisaInstitutionDto,
} from '../entities/clarisa-institutions/dto/create-clarisa-institution.dto';
import { ClarisaInstitution } from '../entities/clarisa-institutions/entities/clarisa-institution.entity';

export const institutionMapper = (
  data: CreateClarisaInstitutionDto,
): DeepPartial<ClarisaInstitution> => ({
  acronym: data?.acronym,
  added: data?.added,
  code: data.code,
  name: data?.name,
  websiteLink: data?.websiteLink,
  institution_type_id: data?.institutionType?.code,
  country_office_id: hqInstitutionsMapper(data.countryOfficeDTO),
});

const hqInstitutionsMapper = (hq: countryOfficeDTO[]): number => {
  return hq.find((el) => el.isHeadquarter == 1).code;
};
