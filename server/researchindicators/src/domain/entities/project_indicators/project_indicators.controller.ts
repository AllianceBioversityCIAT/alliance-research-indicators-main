import {
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { ProjectIndicatorsService } from './project_indicators.service';
import { Post, Body } from '@nestjs/common';
import { CreateProjectIndicatorDto } from './dto/create-project_indicator.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import * as path from 'path';

@ApiTags('project-indicators')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@Controller()
export class ProjectIndicatorsController {
  constructor(
    private readonly projectIndicatorsService: ProjectIndicatorsService,
  ) {}
  @Get('get-list/:id')
  async getAll(@Param('id') agreement_id: string) {
    return await this.projectIndicatorsService
      .findAll(agreement_id)
      .then((data) =>
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
      .syncIndicator(createProjectIndicatorDto)
      .then((data) =>
        ResponseUtils.format({
          description: 'Structure created',
          status: HttpStatus.CREATED,
          data: data,
        }),
      );
  }

  @Get('hierarchy/:id')
  async getHierarchy(@Param('id') agreement_id: string) {
    return await this.projectIndicatorsService
      .getIndicatorsHierarchy(agreement_id)
      .then((data) =>
        ResponseUtils.format({
          description: 'Hierarchy found',
          status: HttpStatus.OK,
          data: data,
        }),
      );
  }

  @Get('indicators/by-result/:id')
  async getByResult(@Param('id') result_id: string) {
    return await this.projectIndicatorsService
      .findByResult(result_id)
      .then((data) =>
        ResponseUtils.format({
          description: 'Indicators found',
          status: HttpStatus.OK,
          data: data,
        }),
      );
  }

  @Delete(':id/delete')
  async softDelete(@Param('id') id: number) {
    const result = await this.projectIndicatorsService.softDelete(id);

    return ResponseUtils.format({
      description: 'Indicator deleted successfully',
      status: HttpStatus.OK,
      data: result,
    });
  }

  @Get('contributions/:agreementId')
  async getContributionsByResult(@Param('agreementId') agreementId: string) {
    return await this.projectIndicatorsService
      .findContributionsByResult(agreementId)
      .then((data) =>
        ResponseUtils.format({
          description: 'Contributions found',
          status: HttpStatus.OK,
          data: data,
        }),
      );
  }

  @Get('excel/:agreementId')
  async getExcel(@Param('agreementId') agreementId: string, @Res() res: Response) {
    const { buffer, fileName } = await this.projectIndicatorsService.generarExcel(agreementId);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );

    res.end(buffer);
  }
}
