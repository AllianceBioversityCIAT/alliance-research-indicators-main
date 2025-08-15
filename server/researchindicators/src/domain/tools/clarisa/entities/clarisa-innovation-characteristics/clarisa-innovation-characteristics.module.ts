import { Module } from '@nestjs/common';
import { ClarisaInnovationCharacteristicsService } from './clarisa-innovation-characteristics.service';
import { ClarisaInnovationCharacteristicsController } from './clarisa-innovation-characteristics.controller';

@Module({
  controllers: [ClarisaInnovationCharacteristicsController],
  providers: [ClarisaInnovationCharacteristicsService],
  exports: [ClarisaInnovationCharacteristicsService],
})
export class ClarisaInnovationCharacteristicsModule {}
