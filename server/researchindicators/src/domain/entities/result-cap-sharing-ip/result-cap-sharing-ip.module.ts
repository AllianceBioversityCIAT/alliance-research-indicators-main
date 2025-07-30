import { Module } from '@nestjs/common';
import { ResultCapSharingIpController } from './result-cap-sharing-ip.controller';
import { ResultIpRightsModule } from '../result-ip-rights/result-ip-rights.module';

@Module({
  controllers: [ResultCapSharingIpController],
  imports: [ResultIpRightsModule],
})
export class ResultCapSharingIpModule {}
