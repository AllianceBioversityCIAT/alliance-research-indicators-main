import { Module } from '@nestjs/common';
import { ClarisaCountriesService } from './clarisa-countries.service';
import { ClarisaCountriesController } from './clarisa-countries.controller';

@Module({
  controllers: [ClarisaCountriesController],
  providers: [ClarisaCountriesService],
})
export class ClarisaCountriesModule {}
