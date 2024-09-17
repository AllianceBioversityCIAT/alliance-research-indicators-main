import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { DeliveryModalitiesService } from './delivery-modalities.service';
import { CreateDeliveryModalityDto } from './dto/create-delivery-modality.dto';
import { UpdateDeliveryModalityDto } from './dto/update-delivery-modality.dto';

@Controller('delivery-modalities')
export class DeliveryModalitiesController {
  constructor(private readonly deliveryModalitiesService: DeliveryModalitiesService) {}

  @Post()
  create(@Body() createDeliveryModalityDto: CreateDeliveryModalityDto) {
    return this.deliveryModalitiesService.create(createDeliveryModalityDto);
  }

  @Get()
  findAll() {
    return this.deliveryModalitiesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.deliveryModalitiesService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDeliveryModalityDto: UpdateDeliveryModalityDto) {
    return this.deliveryModalitiesService.update(+id, updateDeliveryModalityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.deliveryModalitiesService.remove(+id);
  }
}
