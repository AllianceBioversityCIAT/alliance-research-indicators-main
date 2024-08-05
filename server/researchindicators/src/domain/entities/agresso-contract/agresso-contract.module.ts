import { Module } from '@nestjs/common';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractController } from './agresso-contract.controller';

@Module({
  controllers: [AgressoContractController],
  providers: [AgressoContractService],
})
export class AgressoContractModule {}
