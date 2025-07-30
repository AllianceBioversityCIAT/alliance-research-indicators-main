import { Module } from '@nestjs/common';
import { ResultIpRightsService } from './result-ip-rights.service';
import { ResultIpRightsController } from './result-ip-rights.controller';

@Module({
  controllers: [ResultIpRightsController],
  providers: [ResultIpRightsService],
  exports: [ResultIpRightsService],
})
export class ResultIpRightsModule {}
