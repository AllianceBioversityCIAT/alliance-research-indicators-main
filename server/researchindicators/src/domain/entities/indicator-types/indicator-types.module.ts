import { Module } from '@nestjs/common';
import { IndicatorTypesService } from './indicator-types.service';
import { IndicatorTypesController } from './indicator-types.controller';

@Module({
  controllers: [IndicatorTypesController],
  providers: [IndicatorTypesService],
})
export class IndicatorTypesModule {}
