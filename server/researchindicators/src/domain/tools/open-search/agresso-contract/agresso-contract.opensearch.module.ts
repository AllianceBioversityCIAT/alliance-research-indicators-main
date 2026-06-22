import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AgressoContractRepository } from '../../../entities/agresso-contract/repositories/agresso-contract.repository';
import { OpenSearchAgressoContractApi } from './agresso-contract.opensearch.api';
import { AlianceManagementApp } from '../../broker/aliance-management.app';

@Module({
  providers: [
    OpenSearchAgressoContractApi,
    AgressoContractRepository,
    AlianceManagementApp,
  ],
  exports: [OpenSearchAgressoContractApi],
  imports: [HttpModule],
})
export class AgressoContractOpenSearchModule {}
