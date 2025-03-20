import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserAgressoContract } from './entities/user-agresso-contract.entity';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { AgressoContractRepository } from '../agresso-contract/repositories/agresso-contract.repository';

@Injectable()
export class UserAgressoContractsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _agressoContractRepository: AgressoContractRepository,
  ) {}

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

    return existLink;
  }

  async automaticLinkUserAgressoContract(
    user: User,
  ): Promise<UserAgressoContract[]> {
    const { sec_user_id, first_name, last_name } = user;
    const allContracts = await this._agressoContractRepository.findByName(
      first_name,
      last_name,
    );

    const saveData: Partial<UserAgressoContract>[] = allContracts.map(
      ({ agreement_id }) => ({
        agreement_id: agreement_id,
        user_id: sec_user_id,
      }),
    );

    const userAgressoContractRepository = await this.dataSource
      .getRepository(UserAgressoContract)
      .save(saveData);

    return userAgressoContractRepository;
  }
}
