import { Controller, Get, Post, Body, Patch, Param, Delete, HttpStatus } from '@nestjs/common';
import { IssueCategoriesService } from './issue-categories.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Issue Categories')
@ApiBearerAuth()
@Controller()
export class IssueCategoriesController {
  constructor(private readonly issueCategoriesService: IssueCategoriesService) {}
  
  @ApiOperation({ summary: 'Get all issue categories' })
  @Get()
  async find() {
    return await this.issueCategoriesService.find().then((issueCategories) =>
      ResponseUtils.format({
        description: 'Issue categories found',
        status: HttpStatus.OK,
        data: issueCategories,
      }),
    );
  }

}
