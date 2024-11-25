import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultLanguage } from './entities/result-language.entity';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { LanguageRolesEnum } from '../language-roles/enums/language-roles.enum';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
@Injectable()
export class ResultLanguagesService extends BaseServiceSimple<
  ResultLanguage,
  Repository<ResultLanguage>
> {
  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultLanguage,
      dataSource.getRepository(ResultLanguage),
      'result_id',
      currentUser,
      'language_role_id',
    );
  }

  async findLanguageByRoleResult(role: LanguageRolesEnum, resultId: number) {
    const resultUsers = await this.mainRepo.find({
      where: {
        language_role_id: role,
        result_id: resultId,
        is_active: true,
      },
      relations: {
        language: true,
      },
    });

    return resultUsers;
  }
}
