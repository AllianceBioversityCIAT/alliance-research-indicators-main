import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
  HttpStatus,
} from '@nestjs/common';
import { ImpactOutcomesService } from './impact-outcomes.service';
import { CreateImpactOutcomeDto } from './dto/create-impact-outcome.dto';
import { UpdateImpactOutcomeDto } from './dto/update-impact-outcome.dto';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { Roles } from '../../shared/decorators/roles.decorator';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { getPortfolio } from '../../shared/decorators/portfolio.decorator';
import { ParamOrQueryEnum } from '../../shared/decorators/versioning.decorator';
import { PortfolioUtil } from '../../shared/utils/portfolio.util';

@Controller()
@ApiTags('Impact Outcomes')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
export class ImpactOutcomesController {
  constructor(
    private readonly impactOutcomesService: ImpactOutcomesService,
    private readonly portfolioUtil: PortfolioUtil,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new impact outcome' })
  @ApiBody({
    type: CreateImpactOutcomeDto,
    description: 'Create a new impact outcome',
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
  async create(@Body() createImpactOutcomeDto: CreateImpactOutcomeDto) {
    return this.impactOutcomesService
      .create(createImpactOutcomeDto)
      .then((data) =>
        ResponseUtils.format({
          description: 'Impact outcome created successfully',
          data: data,
          status: HttpStatus.CREATED,
        }),
      );
  }

  @Get()
  @ApiOperation({ summary: 'Get all impact outcomes' })
  @getPortfolio(ParamOrQueryEnum.QUERY, true)
  async findAll() {
    return this.impactOutcomesService
      .findAll(this.portfolioUtil.nullPortfolioId)
      .then((data) =>
        ResponseUtils.format({
          description: 'Impact outcomes found',
          data: data,
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a impact outcome by id' })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the impact outcome',
    example: 1,
  })
  async findOne(@Param('id') id: string) {
    return this.impactOutcomesService.findOne(+id).then((data) =>
      ResponseUtils.format({
        description: 'Impact outcome found',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a impact outcome' })
  @ApiBody({
    type: UpdateImpactOutcomeDto,
    description: 'Update a impact outcome',
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
    @Body() updateImpactOutcomeDto: UpdateImpactOutcomeDto,
  ) {
    return this.impactOutcomesService
      .update(+id, updateImpactOutcomeDto)
      .then((data) =>
        ResponseUtils.format({
          description: 'Impact outcome updated successfully',
          data: data,
          status: HttpStatus.OK,
        }),
      );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a impact outcome' })
  @Roles(SecRolesEnum.SYSTEM_ADMIN)
  async remove(@Param('id') id: string) {
    return this.impactOutcomesService.remove(+id).then((data) =>
      ResponseUtils.format({
        description: 'Impact outcome id ' + data + ' was deleted successfully',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }
}
