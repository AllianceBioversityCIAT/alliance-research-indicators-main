import { Module } from '@nestjs/common';
import { UserAgressoContractsService } from './user-agresso-contracts.service';
import { UserAgressoContractsController } from './user-agresso-contracts.controller';

@Module({
  controllers: [UserAgressoContractsController],
  providers: [UserAgressoContractsService],
})
export class UserAgressoContractsModule {}
