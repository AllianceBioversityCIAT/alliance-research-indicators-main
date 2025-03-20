import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { AllianceUserStaffService } from './alliance-user-staff.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Alliance User Staff')
@ApiBearerAuth()
@Controller()
export class AllianceUserStaffController {
  constructor(
    private readonly allianceUserStaffService: AllianceUserStaffService,
  ) {}

  @ApiOperation({
    summary: 'Find all alliance user staff',
  })
  @Get()
  async find() {
    return this.allianceUserStaffService.findAll().then((result) =>
      ResponseUtils.format({
        description: 'Alliance user staff found',
        status: HttpStatus.OK,
        data: result,
      }),
    );
  }

  @ApiOperation({
    summary: 'Find alliance user staff with filters',
  })
  @ApiQuery({
    name: 'name',
    required: false,
    description: 'Alliance user staff name',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Is a reference to the page number',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Is a reference to the limit of items per page',
  })
  @Get('data/filters')
  async findWithFilters(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('name') name: string,
  ) {
    return this.allianceUserStaffService
      .findWithFilters(
        {
          limit: +limit,
          page: +page,
        },
        name,
      )
      .then((result) =>
        ResponseUtils.format({
          description: 'Alliance user staff found',
          status: HttpStatus.OK,
          data: result,
        }),
      );
  }

  @ApiOperation({
    summary: 'Find alliance user staff by id',
  })
  @ApiParam({
    name: 'id',
    type: String,
    required: true,
    description: 'Alliance user staff ID',
  })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.allianceUserStaffService.findOne(id).then((result) =>
      ResponseUtils.format({
        description: 'Alliance user staff found',
        status: HttpStatus.OK,
        data: result,
      }),
    );
  }
}
