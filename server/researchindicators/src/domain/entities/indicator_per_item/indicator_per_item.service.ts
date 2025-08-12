import { Injectable } from '@nestjs/common';
import { CreateIndicatorPerItemDto } from './dto/create-indicator_per_item.dto';
import { UpdateIndicatorPerItemDto } from './dto/update-indicator_per_item.dto';

@Injectable()
export class IndicatorPerItemService {
  create(createIndicatorPerItemDto: CreateIndicatorPerItemDto) {
    return 'This action adds a new indicatorPerItem';
  }

  findAll() {
    return `This action returns all indicatorPerItem`;
  }

  findOne(id: number) {
    return `This action returns a #${id} indicatorPerItem`;
  }

  update(id: number, updateIndicatorPerItemDto: UpdateIndicatorPerItemDto) {
    return `This action updates a #${id} indicatorPerItem`;
  }

  remove(id: number) {
    return `This action removes a #${id} indicatorPerItem`;
  }
}
