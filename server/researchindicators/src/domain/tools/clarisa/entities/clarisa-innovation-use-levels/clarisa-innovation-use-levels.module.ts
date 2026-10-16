import { Module } from '@nestjs/common';
import { ClarisaInnovationUseLevelsService } from './clarisa-innovation-use-levels.service';
import { ClarisaInnovationUseLevelsController } from './clarisa-innovation-use-levels.controller';

@Module({
  controllers: [ClarisaInnovationUseLevelsController],
  providers: [ClarisaInnovationUseLevelsService],
  exports: [ClarisaInnovationUseLevelsService],
})
export class ClarisaInnovationUseLevelsModule {}
