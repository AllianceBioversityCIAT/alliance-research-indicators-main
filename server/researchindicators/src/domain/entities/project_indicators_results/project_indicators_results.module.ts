import { Module } from '@nestjs/common';
import { ProjectIndicatorsResultsService } from './project_indicators_results.service';
import { ProjectIndicatorsResultsController } from './project_indicators_results.controller';

@Module({
  controllers: [ProjectIndicatorsResultsController],
  providers: [ProjectIndicatorsResultsService],
})
export class ProjectIndicatorsResultsModule {}
