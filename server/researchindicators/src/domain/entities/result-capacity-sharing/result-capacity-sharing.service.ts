import { Injectable } from '@nestjs/common';
import { CreateResultCapacitySharingDto } from './dto/create-result-capacity-sharing.dto';
import { UpdateResultCapacitySharingDto } from './dto/update-result-capacity-sharing.dto';

@Injectable()
export class ResultCapacitySharingService {
  create(createResultCapacitySharingDto: CreateResultCapacitySharingDto) {
    return 'This action adds a new resultCapacitySharing';
  }

  findAll() {
    return `This action returns all resultCapacitySharing`;
  }

  findOne(id: number) {
    return `This action returns a #${id} resultCapacitySharing`;
  }

  update(id: number, updateResultCapacitySharingDto: UpdateResultCapacitySharingDto) {
    return `This action updates a #${id} resultCapacitySharing`;
  }

  remove(id: number) {
    return `This action removes a #${id} resultCapacitySharing`;
  }
}
