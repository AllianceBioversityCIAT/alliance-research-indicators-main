import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, UseInterceptors, HttpStatus } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';

@Controller()
@ApiTags('Portfolios')
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
@UseGuards(RolesGuard)
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) { }

  @Post()
  @ApiOperation({ summary: 'Create a portfolio' })
  @ApiBody({ type: CreatePortfolioDto, description: 'Create a portfolio' })
  @Roles(SecRolesEnum.TECHNICAL_SUPPORT, SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.CENTER_ADMIN)
  create(@Body() createPortfolioDto: CreatePortfolioDto) {
    return this.portfoliosService.create(createPortfolioDto).then((data) =>
      ResponseUtils.format({
        description: 'Portfolio created successfully',
        data: data,
        status: HttpStatus.CREATED,
      }),
    );
  }

  @Get()
  @ApiOperation({ summary: 'Get all portfolios' })
  findAll() {
    return this.portfoliosService.findAll().then((data) =>
      ResponseUtils.format({
        description: 'Portfolios found',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a portfolio by id' })
  findOne(@Param('id') id: string) {
    return this.portfoliosService.findOne(+id).then((data) =>
      ResponseUtils.format({
        description: 'Portfolio found',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a portfolio' })
  @ApiBody({ type: UpdatePortfolioDto, description: 'Update a portfolio' })
  @Roles(SecRolesEnum.TECHNICAL_SUPPORT, SecRolesEnum.SYSTEM_ADMIN, SecRolesEnum.CENTER_ADMIN)
  update(@Param('id') id: string, @Body() updatePortfolioDto: UpdatePortfolioDto) {
    return this.portfoliosService.update(+id, updatePortfolioDto).then((data) =>
      ResponseUtils.format({
        description: 'Portfolio updated successfully',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a portfolio' })
  @Roles(SecRolesEnum.SYSTEM_ADMIN)
  remove(@Param('id') id: string) {
    return this.portfoliosService.remove(+id).then((data) =>
      ResponseUtils.format({
        description: 'Portfolio deleted successfully',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }
}
