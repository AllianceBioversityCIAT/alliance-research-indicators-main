import { Module } from '@nestjs/common';
import { ResultCountriesSubNationalsService } from './result-countries-sub-nationals.service';
import { ResultCountriesSubNationalsController } from './result-countries-sub-nationals.controller';

@Module({
  controllers: [ResultCountriesSubNationalsController],
  providers: [ResultCountriesSubNationalsService],
})
export class ResultCountriesSubNationalsModule {}
