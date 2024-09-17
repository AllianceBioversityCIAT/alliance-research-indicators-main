import { Injectable } from '@nestjs/common';
import { CreateResultRegionDto } from './dto/create-result-region.dto';
import { UpdateResultRegionDto } from './dto/update-result-region.dto';

@Injectable()
export class ResultRegionsService {
  create(createResultRegionDto: CreateResultRegionDto) {
    return 'This action adds a new resultRegion';
  }

  findAll() {
    return `This action returns all resultRegions`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultRegion`;
  }

  update(id: number, updateResultRegionDto: UpdateResultRegionDto) {
    return `This action updates a #${id} resultRegion`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultRegion`;
  }
}
