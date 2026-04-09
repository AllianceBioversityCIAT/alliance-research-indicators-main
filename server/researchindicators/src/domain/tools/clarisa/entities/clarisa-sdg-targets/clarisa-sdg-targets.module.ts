import { Module } from '@nestjs/common';
import { ClarisaSdgTargetsService } from './clarisa-sdg-targets.service';
import { ClarisaSdgTargetsController } from './clarisa-sdg-targets.controller';

@Module({
  controllers: [ClarisaSdgTargetsController],
  providers: [ClarisaSdgTargetsService],
  exports: [ClarisaSdgTargetsService],
})
export class ClarisaSdgTargetsModule {}
