import { Module } from '@nestjs/common';
import { IndicatorPerItemService } from './indicator_per_item.service';
import { IndicatorPerItemController } from './indicator_per_item.controller';

@Module({
  controllers: [IndicatorPerItemController],
  providers: [IndicatorPerItemService],
})
export class IndicatorPerItemModule {}
