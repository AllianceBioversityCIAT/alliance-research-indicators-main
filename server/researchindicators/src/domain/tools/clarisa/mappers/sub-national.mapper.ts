import { DeepPartial } from 'typeorm';
import { ClarisaSubNationalRawDto } from '../entities/clarisa-sub-nationals/dto/clarisa-sub-national-raw.dto';
import { ClarisaSubNational } from '../entities/clarisa-sub-nationals/entities/clarisa-sub-national.entity';

export const subNationalMapper = (
  subNational: ClarisaSubNationalRawDto,
): DeepPartial<ClarisaSubNational> => {
  return {
    id: subNational.id,
    code: subNational.code,
    name: subNational.local_name,
    other_names: subNational.other_names,
    country_iso_alpha_2: subNational.country_iso_alpha_2,
    language_iso_2: subNational.language_iso_2,
  };
};
