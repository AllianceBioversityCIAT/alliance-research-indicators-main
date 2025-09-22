import { Module } from '@nestjs/common';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { ClarisaCountriesController } from './clarisa-countries.controller';

@Module({
  controllers: [ClarisaCountriesController],
  providers: [ClarisaCountriesService],
  exports: [ClarisaCountriesService],
})
export class ClarisaCountriesModule {}
