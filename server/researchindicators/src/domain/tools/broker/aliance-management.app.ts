import { Injectable, Logger } from '@nestjs/common';
import { BrokerConnectionBase } from './base/broker-base.connection';
import { env } from 'process';
import { ValidJwtResponse } from '../../shared/global-dto/management-response.dto';
import { LinkUserRoleContractDto } from './dto/link-user-contract.dto';
import { FindUserRoleContractDto } from './dto/find-user-role-contract.dto';
import { SecUserContractDto } from '../../entities/agresso-contract/dto/sec-user-contract.dto';
@Injectable()
export class AlianceManagementApp extends BrokerConnectionBase {
  protected readonly _logger = new Logger(AlianceManagementApp.name);

  constructor() {
    super(env.ARI_QUEUE_SECONDARY);
  }

  async validJwtToken(token: string): Promise<ValidJwtResponse> {
    return this.sendToPattern<string, ValidJwtResponse>('valid-jwt', token);
  }

  async linkUserToContract(
    userId: number,
    agreementId: string,
    role_id: number,
  ): Promise<void> {
    const payload: LinkUserRoleContractDto = {
      contract_id: agreementId,
      user_id: userId,
      role_id: role_id,
    };
    return this.emitToPattern('link-user-contract', payload);
  }

  async findUserToContract(
    userId: number,
    role_id?: number,
  ): Promise<SecUserContractDto[]> {
    const payload: FindUserRoleContractDto = {
      user_id: userId,
      role_id: role_id,
    };
    return this.sendToPattern<FindUserRoleContractDto, SecUserContractDto[]>(
      'find-user-contract',
      payload,
    );
  }
}
