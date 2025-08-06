import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { ProjectGroupsService } from './project_groups.service';
import { CreateProjectGroupDto } from './dto/create-project_group.dto';
import { UpdateProjectGroupDto } from './dto/update-project_group.dto';

@Controller('project-groups')
export class ProjectGroupsController {
  constructor(private readonly projectGroupsService: ProjectGroupsService) {}

  @Post()
  create(@Body() createProjectGroupDto: CreateProjectGroupDto) {
    return this.projectGroupsService.create(createProjectGroupDto);
  }

  @Get()
  findAll() {
    return this.projectGroupsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectGroupsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProjectGroupDto: UpdateProjectGroupDto) {
    return this.projectGroupsService.update(+id, updateProjectGroupDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.projectGroupsService.remove(+id);
  }
}
