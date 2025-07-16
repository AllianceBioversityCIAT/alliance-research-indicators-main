import { Module } from '@nestjs/common';
import { ClarisaInnovationReadinessLevelsService } from './clarisa-innovation-readiness-levels.service';
import { ClarisaInnovationReadinessLevelsController } from './clarisa-innovation-readiness-levels.controller';

@Module({
  controllers: [ClarisaInnovationReadinessLevelsController],
  providers: [ClarisaInnovationReadinessLevelsService],
  exports: [ClarisaInnovationReadinessLevelsService],
})
export class ClarisaInnovationReadinessLevelsModule {}
