import { Module } from '@nestjs/common';
import { AgressoContractCountriesService } from './agresso-contract-countries.service';
import { AgressoContractCountriesController } from './agresso-contract-countries.controller';

@Module({
  controllers: [AgressoContractCountriesController],
  providers: [AgressoContractCountriesService],
})
export class AgressoContractCountriesModule {}
