import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProjectIndicatorsResultsService } from './project_indicators_results.service';
import { CreateProjectIndicatorsResultDto } from './dto/create-project_indicators_result.dto';
import { UpdateProjectIndicatorsResultDto } from './dto/update-project_indicators_result.dto';

@Controller('project-indicators-results')
export class ProjectIndicatorsResultsController {
  constructor(private readonly projectIndicatorsResultsService: ProjectIndicatorsResultsService) {}

  @Post()
  create(@Body() createProjectIndicatorsResultDto: CreateProjectIndicatorsResultDto) {
    return this.projectIndicatorsResultsService.create(createProjectIndicatorsResultDto);
  }

}
