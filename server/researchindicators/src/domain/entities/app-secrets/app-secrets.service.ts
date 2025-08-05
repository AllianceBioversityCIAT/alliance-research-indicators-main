import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AppSecret } from './entities/app-secret.entity';
import { AppConfig } from '../../shared/utils/app-config.util';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { CreateAppSecretDto } from './dto/create-app-secret.dto';
import { AppSecretHostList } from '../app-secret-host-list/entities/app-secret-host-list.entity';
import { ValidJwtResponse } from '../../shared/global-dto/management-response.dto';
import { AppSecretRepository } from './repositories/app-secret.repository';

@Injectable()
export class AppSecretsService {
  private readonly mainRepo: Repository<AppSecret>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly appConfigUtil: AppConfig,
    private readonly appSecretRepository: AppSecretRepository,
  ) {
    this.mainRepo = this.dataSource.getRepository(AppSecret);
  }

  generateRandomPassword(length: number = 16): string {
    return crypto
      .randomBytes(length)
      .toString('base64')
      .replace(/[^a-zA-Z0-9]/g, '')
      .substring(0, length);
  }

  async createCredentials(data: CreateAppSecretDto) {
    const password: string = this.generateRandomPassword();
    const clientId: string = uuidv4();

    const user = await this.appSecretRepository.getUserValidation(
      data.responsible_id,
    );

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await this.dataSource.transaction(async (manager) => {
      const newSecret = manager.getRepository(this.mainRepo.target).create({
        app_secret_key: bcrypt.hashSync(password, this.appConfigUtil.SALT),
        app_secret_uuid: clientId,
        app_secret_description: data?.application_description,
        responsible_user_id: user.sec_user_id,
      });
      const result = await manager
        .getRepository(this.mainRepo.target)
        .save(newSecret);
      if (data?.white_listed_hosts?.length > 0) {
        const appSecretHostList = data.white_listed_hosts.map((host) => ({
          host,
          app_secret_id: result.app_secret_id,
        }));
        await manager.getRepository(AppSecretHostList).save(appSecretHostList);
      }
      return result;
    });

    return {
      app_secret_key: password,
      app_secret_uuid: clientId,
      responsible_user_code: data.responsible_id,
      app_secret_description: data?.application_description,
    };
  }

  async validation(
    clientId: string,
    secretKey: string,
    origin: string,
  ): Promise<ValidJwtResponse> {
    const appSecret = await this.mainRepo.findOne({
      where: { app_secret_uuid: clientId, is_active: true },
      select: {
        app_secret_key: true,
        app_secret_id: true,
        app_secret_host_list: true,
        responsible_user_id: true,
      },
      relations: {
        app_secret_host_list: true,
      },
    });

    if (!appSecret) {
      return {
        isValid: false,
        user: null,
      };
    }

    let valid: boolean = bcrypt.compareSync(
      secretKey,
      appSecret?.app_secret_key,
    );

    if (!valid) {
      return {
        isValid: false,
        user: null,
      };
    }

    const whitelistHosts = appSecret?.app_secret_host_list?.length ?? 0;

    if (whitelistHosts > 0) {
      const isOriginWhitelisted = appSecret?.app_secret_host_list?.some(
        (host) => host.host === origin,
      );
      if (!isOriginWhitelisted) {
        valid = false;
      }
    }

    const user = await this.appSecretRepository.getUserValidation(
      appSecret.responsible_user_id,
    );

    return {
      isValid: valid,
      user: user,
    };
  }
}
