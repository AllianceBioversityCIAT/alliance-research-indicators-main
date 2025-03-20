import { Module } from '@nestjs/common';
import { ClarisaLeversService } from './clarisa-levers.service';
import { ClarisaLeversController } from './clarisa-levers.controller';

@Module({
  controllers: [ClarisaLeversController],
  providers: [ClarisaLeversService],
})
export class ClarisaLeversModule {}
