import { Injectable } from '@nestjs/common';
import { CreateDeliveryModalityDto } from './dto/create-delivery-modality.dto';
import { UpdateDeliveryModalityDto } from './dto/update-delivery-modality.dto';

@Injectable()
export class DeliveryModalitiesService {
  create(createDeliveryModalityDto: CreateDeliveryModalityDto) {
    return 'This action adds a new deliveryModality';
  }

  findAll() {
    return `This action returns all deliveryModalities`;
  }

  findOne(id: number) {
    return `This action returns a #${id} deliveryModality`;
  }

  update(id: number, updateDeliveryModalityDto: UpdateDeliveryModalityDto) {
    return `This action updates a #${id} deliveryModality`;
  }

  remove(id: number) {
    return `This action removes a #${id} deliveryModality`;
  }
}
