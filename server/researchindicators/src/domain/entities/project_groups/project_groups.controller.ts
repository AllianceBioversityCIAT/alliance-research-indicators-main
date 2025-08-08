import { Controller, Get, Post, Body, Param, UseInterceptors, HttpStatus} from '@nestjs/common';
import { ProjectGroupsService } from './project_groups.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { StructureDto } from './dto/structure.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('project_structure')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ProjectGroupsController {
  constructor(private readonly projectGroupsService: ProjectGroupsService) {}

  @Post('manage-structure')
  async manageStructure(@Body() dto: StructureDto) {
    return this.projectGroupsService.handleStructure(dto);
  }

  @Get('structure-list')
  async findAll() {
    return this.projectGroupsService
    .findAll()
    .then((structure) =>
      ResponseUtils.format({
        description: 'Structure found',
        status: HttpStatus.OK,
        data: structure,
      }),
    );
  }
}
