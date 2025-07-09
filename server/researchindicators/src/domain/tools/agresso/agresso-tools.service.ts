import { Injectable, Logger } from '@nestjs/common';
import { Agresso } from './agresso-tools.connection';
import { AgressoContract } from '../../entities/agresso-contract/entities/agresso-contract.entity';
import { AgressoContractRawDto } from '../../entities/agresso-contract/dto/agresso-contract-raw.dto';
import { AgressoContractMapper } from '../../shared/mappers/agresso-contract.mapper';
import { BaseControlListSave } from '../../shared/global-dto/base-control-list-save';
import { DataSource, DeepPartial } from 'typeorm';
import { ClarisaSdg } from '../clarisa/entities/clarisa-sdgs/entities/clarisa-sdg.entity';

@Injectable()
export class AgressoToolsService extends BaseControlListSave<Agresso> {
  constructor(dataSource: DataSource) {
    super(dataSource, new Agresso(), new Logger(AgressoToolsService.name));
  }

  async cloneAllAgressoEntities() {
    const clarisaSdg = await this.dataSource.getRepository(ClarisaSdg).find();
    this.base<AgressoContractRawDto, AgressoContract>(
      'getAgreementsRM',
      AgressoContract,
      null,
      (data) => this.cleanDuplicates(data, clarisaSdg),
    );
  }

  private cleanDuplicates(
    data: AgressoContractRawDto[],
    clarisaSdg: ClarisaSdg[],
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
    return cleanData.map((data) => AgressoContractMapper(data, clarisaSdg));
  }
}
