import { Injectable } from '@nestjs/common';
import { CreateResultCapacitySharingDto } from './dto/create-result-capacity-sharing.dto';
import { UpdateResultCapacitySharingDto } from './dto/update-result-capacity-sharing.dto';

@Injectable()
export class ResultCapacitySharingService {
  create(createResultCapacitySharingDto: CreateResultCapacitySharingDto) {
    return 'This action adds a new resultCapacitySharing';
  }

  private async individual() {}

  private async group() {}
}
