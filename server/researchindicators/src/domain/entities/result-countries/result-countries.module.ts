import { Module } from '@nestjs/common';
import { ResultCountriesService } from './result-countries.service';
import { ResultCountriesController } from './result-countries.controller';

@Module({
  controllers: [ResultCountriesController],
  providers: [ResultCountriesService],
  exports: [ResultCountriesService],
})
export class ResultCountriesModule {}
