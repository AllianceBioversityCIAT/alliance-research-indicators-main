import { Module } from '@nestjs/common';
import { ProjectIndicatorsService } from './project_indicators.service';
import { ProjectIndicatorsController } from './project_indicators.controller';
import { ProjectIndicator } from './entities/project_indicator.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  controllers: [ProjectIndicatorsController],
  providers: [ProjectIndicatorsService],
  imports: [TypeOrmModule.forFeature([ProjectIndicator])],
})
export class ProjectIndicatorsModule {}
