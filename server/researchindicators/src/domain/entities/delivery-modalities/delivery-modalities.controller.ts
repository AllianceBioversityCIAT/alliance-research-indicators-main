import { Controller, Get, HttpStatus, Param } from '@nestjs/common';
import { DeliveryModalitiesService } from './delivery-modalities.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Delivery Modalities')
@ApiBearerAuth()
@Controller()
export class DeliveryModalitiesController {
  constructor(
    private readonly deliveryModalitiesService: DeliveryModalitiesService,
  ) {}

  @ApiOperation({ summary: 'Get all delivery modalities' })
  @Get()
  async findAll() {
    return this.deliveryModalitiesService.findAll().then((res) =>
      ResponseUtils.format({
        description: 'Delivery modalities found',
        status: HttpStatus.OK,
        data: res,
      }),
    );
  }

  @ApiOperation({ summary: 'Get a delivery modality by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.deliveryModalitiesService.findOne(+id).then((res) =>
      ResponseUtils.format({
        description: 'Delivery modality found',
        status: HttpStatus.OK,
        data: res,
      }),
    );
  }
}
