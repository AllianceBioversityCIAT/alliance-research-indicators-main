import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProjectIndicatorsService } from './project_indicators.service';
import { CreateProjectIndicatorDto } from './dto/create-project_indicator.dto';
import { UpdateProjectIndicatorDto } from './dto/update-project_indicator.dto';

@Controller('project-indicators')
export class ProjectIndicatorsController {
  constructor(private readonly projectIndicatorsService: ProjectIndicatorsService) {}

  @Post()
  create(@Body() createProjectIndicatorDto: CreateProjectIndicatorDto) {
    return this.projectIndicatorsService.create(createProjectIndicatorDto);
  }

  @Get()
  findAll() {
    return this.projectIndicatorsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectIndicatorsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectIndicatorDto: UpdateProjectIndicatorDto) {
    return this.projectIndicatorsService.update(+id, updateProjectIndicatorDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectIndicatorsService.remove(+id);
  }
}
