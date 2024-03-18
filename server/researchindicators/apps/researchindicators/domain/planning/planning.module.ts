import { Module } from '@nestjs/common';
import { PlanningService } from './planning.service';
import { PlanningController } from './planning.controller';

@Module({
  controllers: [PlanningController],
  providers: [PlanningService],
})
export class PlanningModule {}
