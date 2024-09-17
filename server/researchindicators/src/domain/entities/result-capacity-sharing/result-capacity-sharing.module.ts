import { Module } from '@nestjs/common';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';
import { ResultCapacitySharingController } from './result-capacity-sharing.controller';

@Module({
  controllers: [ResultCapacitySharingController],
  providers: [ResultCapacitySharingService],
})
export class ResultCapacitySharingModule {}
