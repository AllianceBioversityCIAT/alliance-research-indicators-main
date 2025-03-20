import { CreateClarisaInstitutionTypeDto } from '../entities/clarisa-institution-types/dto/create-clarisa-institution-type.dto';
import { ClarisaInstitutionType } from '../entities/clarisa-institution-types/entities/clarisa-institution-type.entity';

export const institutionTypeMapper = (
  data: CreateClarisaInstitutionTypeDto,
): Partial<ClarisaInstitutionType> => ({
  code: data.code,
  name: data?.name,
  description: data?.description,
  parent_code: data?.id_parent,
});
