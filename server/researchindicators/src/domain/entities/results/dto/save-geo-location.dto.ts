import { ClarisaGeoScopeEnum } from '../../../tools/clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { ResultCountry } from '../../result-countries/entities/result-country.entity';
import { ResultRegion } from '../../result-regions/entities/result-region.entity';

export class SaveGeoLocationDto {
  geo_scope_id: ClarisaGeoScopeEnum;
  countries: ResultCountry[];
  regions: ResultRegion[];
}
