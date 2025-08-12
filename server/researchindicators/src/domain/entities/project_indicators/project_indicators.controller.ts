import { Controller, Get, HttpStatus, UseInterceptors } from '@nestjs/common';
import { ProjectIndicatorsService } from './project_indicators.service';
import { Post, Body } from '@nestjs/common';
import { CreateProjectIndicatorDto } from './dto/create-project_indicator.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('project-indicators')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ProjectIndicatorsController {
  constructor(
    private readonly projectIndicatorsService: ProjectIndicatorsService,
  ) {}
  @Get('get-list')
  async getAll() {
    return await this.projectIndicatorsService.findAll().then((data) =>
      ResponseUtils.format({
        description: 'Structure found',
        status: HttpStatus.OK,
        data: data,
      }),
    );
  }

  @Post('create')
  async create(@Body() createProjectIndicatorDto: CreateProjectIndicatorDto) {
    return await this.projectIndicatorsService
      .create(createProjectIndicatorDto)
      .then((data) =>
        ResponseUtils.format({
          description: 'Structure created',
          status: HttpStatus.CREATED,
          data: data,
        }),
      );
  }
}
