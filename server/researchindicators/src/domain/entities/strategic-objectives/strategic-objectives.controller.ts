import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UseGuards,
  ValidationPipe,
  UsePipes,
  HttpStatus,
} from '@nestjs/common';
import { StrategicObjectivesService } from './strategic-objectives.service';
import { CreateStrategicObjectiveDto } from './dto/create-strategic-objective.dto';
import { UpdateStrategicObjectiveDto } from './dto/update-strategic-objective.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { PortfolioUtil } from '../../shared/utils/portfolio.util';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { getPortfolio } from '../../shared/decorators/portfolio.decorator';
import { ParamOrQueryEnum } from '../../shared/decorators/versioning.decorator';

@Controller()
@ApiTags('Strategic Objectives')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
export class StrategicObjectivesController {
  constructor(
    private readonly strategicObjectivesService: StrategicObjectivesService,
    private readonly portfolioUtil: PortfolioUtil,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a strategic objective' })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @ApiBody({
    type: CreateStrategicObjectiveDto,
    description: 'Create a strategic objective',
  })
  @Roles(
    SecRolesEnum.TECHNICAL_SUPPORT,
    SecRolesEnum.SYSTEM_ADMIN,
    SecRolesEnum.CENTER_ADMIN,
  )
  async create(
    @Body() createStrategicObjectiveDto: CreateStrategicObjectiveDto,
  ) {
    return this.strategicObjectivesService
      .create(createStrategicObjectiveDto)
      .then((data) =>
        ResponseUtils.format({
          description: 'Strategic objective created successfully',
          data: data,
          status: HttpStatus.CREATED,
        }),
      );
  }

  @Get()
  @ApiOperation({ summary: 'Get all strategic objectives' })
  @getPortfolio(ParamOrQueryEnum.QUERY, true)
  async findAll() {
    return this.strategicObjectivesService
      .findAll(this.portfolioUtil.nullPortfolioId)
      .then((data) =>
        ResponseUtils.format({
          description: 'Strategic objectives found',
          data: data,
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a strategic objective by id' })
  findOne(@Param('id') id: string) {
    return this.strategicObjectivesService.findOne(+id).then((data) =>
      ResponseUtils.format({
        description: 'Strategic objective found',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a strategic objective' })
  @ApiBody({
    type: UpdateStrategicObjectiveDto,
    description: 'Update a strategic objective',
  })
  @Roles(
    SecRolesEnum.TECHNICAL_SUPPORT,
    SecRolesEnum.SYSTEM_ADMIN,
    SecRolesEnum.CENTER_ADMIN,
  )
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async update(
    @Param('id') id: string,
    @Body() updateStrategicObjectiveDto: UpdateStrategicObjectiveDto,
  ) {
    return this.strategicObjectivesService
      .update(+id, updateStrategicObjectiveDto)
      .then((data) =>
        ResponseUtils.format({
          description: 'Strategic objective updated successfully',
          data: data,
          status: HttpStatus.OK,
        }),
      );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a strategic objective' })
  @Roles(SecRolesEnum.SYSTEM_ADMIN)
  async remove(@Param('id') id: string) {
    return this.strategicObjectivesService.remove(+id).then((data) =>
      ResponseUtils.format({
        description:
          'Strategic objective id ' + data + ' was deleted successfully',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }
}
