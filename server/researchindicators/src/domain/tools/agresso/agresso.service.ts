import { Injectable, Logger } from '@nestjs/common';
import { Agresso } from './agresso.connection';
import { AgressoContract } from '../../entities/agresso-contract/entities/agresso-contract.entity';
import { AgressoContractRawDto } from '../../entities/agresso-contract/dto/agresso-contract-raw.dto';
import { AgressoContractMapper } from '../../shared/mappers/agresso-contract.mapper';
import { BaseControlListSave } from '../../shared/global-dto/base-control-list-save';
import { DataSource } from 'typeorm';

@Injectable()
export class AgressoService extends BaseControlListSave<Agresso> {
  constructor(dataSource: DataSource) {
    super(dataSource, new Agresso(), new Logger(AgressoService.name));
  }

  async cloneAllAgressoEntities() {
    this.base<AgressoContractRawDto, AgressoContract>(
      'getAgreementsRM',
      AgressoContract,
      (data) => AgressoContractMapper(data),
    );
  }
}
