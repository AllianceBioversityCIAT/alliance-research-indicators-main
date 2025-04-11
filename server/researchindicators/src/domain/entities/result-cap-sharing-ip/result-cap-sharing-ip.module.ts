import { Module } from '@nestjs/common';
import { ResultCapSharingIpService } from './result-cap-sharing-ip.service';
import { ResultCapSharingIpController } from './result-cap-sharing-ip.controller';

@Module({
  controllers: [ResultCapSharingIpController],
  providers: [ResultCapSharingIpService],
})
export class ResultCapSharingIpModule {}
