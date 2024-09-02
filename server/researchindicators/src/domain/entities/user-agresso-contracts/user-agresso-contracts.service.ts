import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserAgressoContract } from './entities/user-agresso-contract.entity';
import { ResponseUtils } from '../../shared/utils/response.utils';

@Injectable()
export class UserAgressoContractsService {
  constructor(private readonly dataSource: DataSource) {}

  async linkUserToContract(userId: number, agreementId: string) {
    const userAgressoContractRepository =
      this.dataSource.getRepository(UserAgressoContract);

    let existLink: UserAgressoContract =
      await userAgressoContractRepository.findOne({
        where: {
          user_id: userId,
          agreement_id: agreementId,
        },
      });

    if (existLink && !existLink.is_active) {
      await userAgressoContractRepository.update(
        existLink.user_agresso_contract_id,
        {
          is_active: true,
        },
      );
      existLink.is_active = true;
    } else if (!existLink) {
      existLink = await userAgressoContractRepository.save({
        user_id: userId,
        agreement_id: agreementId,
      });
    }

    return ResponseUtils.format({
      description: 'User linked to contract',
      status: HttpStatus.OK,
      data: existLink,
    });
  }
}
