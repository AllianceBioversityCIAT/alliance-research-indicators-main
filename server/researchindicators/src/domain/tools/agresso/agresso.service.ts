import { Injectable, Logger } from '@nestjs/common';
import { Agresso } from './agresso.connection';
import { AgressoContract } from '../../entities/agresso-contract/entities/agresso-contract.entity';
import { AgressoContractRawDto } from '../../entities/agresso-contract/dto/agresso-contract-raw.dto';
import { AgressoContractMapper } from '../../shared/mappers/agresso-contract.mapper';
import { BaseControlListSave } from '../../shared/global-dto/base-control-list-save';
import { DataSource, DeepPartial } from 'typeorm';

@Injectable()
export class AgressoService extends BaseControlListSave<Agresso> {
  constructor(dataSource: DataSource) {
    super(dataSource, new Agresso(), new Logger(AgressoService.name));
  }

  async cloneAllAgressoEntities() {
    this.base<AgressoContractRawDto, AgressoContract>(
      'getAgreementsRM',
      AgressoContract,
      null,
      (data) => this.cleanDuplicates(data),
    );
  }

  private cleanDuplicates(
    data: AgressoContractRawDto[],
  ): DeepPartial<AgressoContract>[] {
    const idCount = new Map<string, number>();
    const cleanData: AgressoContractRawDto[] = [];
    data.forEach((item) => {
      const id = item.agreement_id;
      if (idCount.has(id)) {
        idCount.set(id, idCount.get(id) + 1);
      } else {
        idCount.set(id, 1);
        cleanData.push(item);
      }
    });
    return cleanData.map((data) => AgressoContractMapper(data));
  }
}
