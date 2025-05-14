import { Module } from '@nestjs/common';
import { PolicyStagesService } from './policy-stages.service';
import { PolicyStagesController } from './policy-stages.controller';

@Module({
  controllers: [PolicyStagesController],
  providers: [PolicyStagesService],
  exports: [PolicyStagesService],
})
export class PolicyStagesModule {}
