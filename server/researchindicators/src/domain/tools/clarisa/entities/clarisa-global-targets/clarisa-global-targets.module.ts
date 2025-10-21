import { Module } from '@nestjs/common';
import { ClarisaGlobalTargetsService } from './clarisa-global-targets.service';
import { ClarisaGlobalTargetsController } from './clarisa-global-targets.controller';

@Module({
  controllers: [ClarisaGlobalTargetsController],
  providers: [ClarisaGlobalTargetsService],
  exports: [ClarisaGlobalTargetsService],
})
export class ClarisaGlobalTargetsModule {}
