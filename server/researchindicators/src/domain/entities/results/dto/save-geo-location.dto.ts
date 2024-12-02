import { ApiProperty } from '@nestjs/swagger';
import { ClarisaGeoScopeEnum } from '../../../tools/clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import { ResultCountry } from '../../result-countries/entities/result-country.entity';
import { ResultRegion } from '../../result-regions/entities/result-region.entity';

export class SaveGeoLocationDto {
  @ApiProperty({
    type: Number,
    enum: ClarisaGeoScopeEnum,
    description: 'Geo scope id',
  })
  geo_scope_id: ClarisaGeoScopeEnum;

  @ApiProperty({
    type: ResultCountry,
    isArray: true,
  })
  countries: ResultCountry[];

  @ApiProperty({
    type: ResultRegion,
    isArray: true,
  })
  regions: ResultRegion[];
}
