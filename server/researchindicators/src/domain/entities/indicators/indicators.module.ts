import { Module } from '@nestjs/common';
import { IndicatorsService } from './indicators.service';
import { IndicatorsController } from './indicators.controller';
import { IndicatorRepository } from './repository/indicators.repository';

@Module({
  controllers: [IndicatorsController],
  providers: [IndicatorsService, IndicatorRepository],
  exports: [IndicatorsService, IndicatorRepository],
})
export class IndicatorsModule {}
