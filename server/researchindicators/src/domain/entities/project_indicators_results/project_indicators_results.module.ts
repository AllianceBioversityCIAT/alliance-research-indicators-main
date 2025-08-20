import { Module } from '@nestjs/common';
import { ProjectIndicatorsResultsService } from './project_indicators_results.service';
import { ProjectIndicatorsResultsController } from './project_indicators_results.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectIndicatorsResult } from './entities/project_indicators_result.entity';

@Module({
  controllers: [ProjectIndicatorsResultsController],
  providers: [ProjectIndicatorsResultsService],
  imports: [TypeOrmModule.forFeature([ProjectIndicatorsResult])],
})
export class ProjectIndicatorsResultsModule {}
