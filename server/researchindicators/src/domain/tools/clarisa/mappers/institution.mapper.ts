import { DeepPartial } from 'typeorm';
import {
  CountryOfficeDTO,
  CreateClarisaInstitutionDto,
} from '../entities/clarisa-institutions/dto/create-clarisa-institution.dto';
import { ClarisaInstitution } from '../entities/clarisa-institutions/entities/clarisa-institution.entity';
import { ClarisaInstitutionLocation } from '../entities/clarisa-institution-locations/entities/clarisa-institution-location.entity';
import { isEmpty } from '../../../shared/utils/object.utils';

export const institutionMapper = (
  data: CreateClarisaInstitutionDto,
  locationArray: Partial<ClarisaInstitutionLocation>[],
): DeepPartial<ClarisaInstitution> => {
  hqInstitutionsMapper(data?.countryOfficeDTO, data?.code, locationArray);
  return {
    acronym: data?.acronym,
    added: data?.added,
    code: data.code,
    name: data?.name,
    websiteLink: data?.websiteLink,
    institution_type_id: data?.institutionType?.code,
  };
};

const hqInstitutionsMapper = (
  hq: CountryOfficeDTO[],
  code: number,
  locationArray: Partial<ClarisaInstitutionLocation>[],
): void => {
  hq.forEach((hq) => {
    if (
      !isEmpty(hq?.code) &&
      !isEmpty(code) &&
      !isEmpty(hq?.name) &&
      !isEmpty(hq?.isoAlpha2)
    ) {
      locationArray.push({
        code: hq.code,
        name: hq.name,
        isoAlpha2: hq.isoAlpha2,
        isHeadquarter: hq.isHeadquarter == 1,
        institution_id: code,
      });
    }
  });
};
