import { Module } from '@nestjs/common';
import { IpRightsApplicationOptionsService } from './ip-rights-application-options.service';
import { IpRightsApplicationOptionsController } from './ip-rights-application-options.controller';

@Module({
  controllers: [IpRightsApplicationOptionsController],
  providers: [IpRightsApplicationOptionsService],
})
export class IpRightsApplicationOptionsModule {}
