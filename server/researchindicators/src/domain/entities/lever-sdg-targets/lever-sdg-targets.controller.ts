import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { LeverSdgTargetsService } from './lever-sdg-targets.service';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import {
  ApiBearerAuth,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { CreateLeverSdgTargetDto } from './dto/create-lever-sdg-target.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { TrueFalseEnum } from '../../shared/enum/queries.enum';

@Controller()
@UseInterceptors(SetUpInterceptor)
@ApiBearerAuth()
@ApiTags('Lever Sdg Targets')
export class LeverSdgTargetsController {
  constructor(
    private readonly leverSdgTargetsService: LeverSdgTargetsService,
  ) {}

  @Patch()
  @ApiBody({
    type: CreateLeverSdgTargetDto,
    description: 'Create a new lever sdg target',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  @Roles(SecRolesEnum.TECHNICAL_SUPPORT)
  @UseGuards(RolesGuard)
  create(@Body() createLeverSdgTargetDto: CreateLeverSdgTargetDto) {
    return this.leverSdgTargetsService
      .createDataTransaction(createLeverSdgTargetDto)
      .then((data) =>
        ResponseUtils.format({
          description: 'Lever Sdg Target created successfully',
          data: data,
          status: HttpStatus.CREATED,
        }),
      );
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID of the Lever Sdg Target',
    example: 1,
  })
  @Roles(SecRolesEnum.TECHNICAL_SUPPORT)
  @UseGuards(RolesGuard)
  async delete(@Param('id') id: number) {
    return this.leverSdgTargetsService.softDelete(id).then((data) =>
      ResponseUtils.format({
        description: 'Lever Sdg Target deleted successfully',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }

  @Get('by-lever/:leverId')
  @ApiParam({
    name: 'leverId',
    type: Number,
    description: 'ID of the Lever',
    example: 1,
  })
  @ApiQuery({
    name: 'only_sdg_targets',
    type: Boolean,
    description: 'Only SDG Targets',
    enum: TrueFalseEnum,
    required: false,
  })
  async findByLeverId(
    @Param('leverId') leverId: number,
    @Query('only_sdg_targets', new DefaultValuePipe(TrueFalseEnum.FALSE))
    only_sdg_targets: TrueFalseEnum,
  ) {
    return this.leverSdgTargetsService
      .findByLeverId(leverId, only_sdg_targets == TrueFalseEnum.TRUE)
      .then((data) =>
        ResponseUtils.format({
          description: `List of Lever Sdg Targets for lever ID ${leverId}`,
          data: data,
          status: HttpStatus.OK,
        }),
      );
  }

  @Get()
  async findAll() {
    return this.leverSdgTargetsService.findAll().then((data) =>
      ResponseUtils.format({
        description: 'List of all Lever Sdg Targets',
        data: data,
        status: HttpStatus.OK,
      }),
    );
  }
}
