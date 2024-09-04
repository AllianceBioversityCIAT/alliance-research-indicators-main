import { Module } from '@nestjs/common';
import { AgressoContractService } from './agresso-contract.service';
import { AgressoContractController } from './agresso-contract.controller';
import { AgressoContractRepository } from './repositories/agresso-contract.repository';

@Module({
  controllers: [AgressoContractController],
  providers: [AgressoContractService, AgressoContractRepository],
})
export class AgressoContractModule {}
