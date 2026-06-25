import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ClarisaLeversService } from './clarisa-levers.service';
import { ResponseUtils } from '../../../../shared/utils/response.utils';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SecRolesEnum } from '../../../../shared/enum/sec_role.enum';
import { Roles } from '../../../../shared/decorators/roles.decorator';
import { CreateClarisaLeverDto } from './dto/clarisa-levers-raw.dto';
import { SetUpInterceptor } from '../../../../shared/Interceptors/setup.interceptor';
import { PortfolioUtil } from '../../../../shared/utils/portfolio.util';
import { getPortfolio } from '../../../../shared/decorators/portfolio.decorator';
import { ParamOrQueryEnum } from '../../../../shared/decorators/versioning.decorator';

@ApiTags('Clarisa')
@Controller()
@UseInterceptors(SetUpInterceptor)
@ApiBearerAuth()
export class ClarisaLeversController {
  constructor(
    private readonly clarisaLeversService: ClarisaLeversService,
    private readonly _portfolioUtil: PortfolioUtil,
  ) {}

  @Get()
  @getPortfolio(ParamOrQueryEnum.QUERY, true)
  async find() {
    return this.clarisaLeversService
      .findAllWithPortfolio(this._portfolioUtil.nullPortfolioId)
      .then((levers) =>
        ResponseUtils.format({
          description: 'Levers found',
          data: this.clarisaLeversService.iconMapper(levers),
          status: HttpStatus.OK,
        }),
      );
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.clarisaLeversService.findOne<number>(+id).then((levers) =>
      ResponseUtils.format({
        description: 'Levers found',
        data: levers,
        status: HttpStatus.OK,
      }),
    );
  }

  @Post()
  @ApiOperation({ summary: 'Create a clarisa lever' })
  @ApiBody({
    type: CreateClarisaLeverDto,
    description: 'Create a clarisa lever',
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
  create(@Body() createClarisaLeverDto: CreateClarisaLeverDto) {
    return this.clarisaLeversService
      .create(createClarisaLeverDto)
      .then((data) =>
        ResponseUtils.format({
          description: 'Clarisa lever created successfully',
          data: data,
          status: HttpStatus.CREATED,
        }),
      );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a clarisa lever' })
  @ApiBody({
    type: CreateClarisaLeverDto,
    description: 'Update a clarisa lever',
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
  update(
    @Param('id') id: string,
    @Body() updateClarisaLeverDto: CreateClarisaLeverDto,
  ) {
    return this.clarisaLeversService
      .update(+id, updateClarisaLeverDto)
      .then((data) =>
        ResponseUtils.format({
          description: 'Clarisa lever updated successfully',
          data: data,
          status: HttpStatus.OK,
        }),
      );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a clarisa lever' })
  @Roles(SecRolesEnum.SYSTEM_ADMIN)
  remove(@Param('id') id: string) {
    return this.clarisaLeversService.remove(+id).then((data) =>
      ResponseUtils.format({
        description: 'Clarisa lever id ' + data + ' was deleted successfully',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }
}
