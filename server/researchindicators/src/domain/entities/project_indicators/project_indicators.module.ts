import { Module } from '@nestjs/common';
import { ProjectIndicatorsService } from './project_indicators.service';
import { ProjectIndicatorsController } from './project_indicators.controller';

@Module({
  controllers: [ProjectIndicatorsController],
  providers: [ProjectIndicatorsService],
})
export class ProjectIndicatorsModule {}
