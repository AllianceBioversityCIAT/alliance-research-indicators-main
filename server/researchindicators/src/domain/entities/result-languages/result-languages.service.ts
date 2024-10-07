import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { selectManager } from '../../shared/utils/orm.util';
import { ResultLanguage } from './entities/result-language.entity';
import { LanguageRolesEnum } from '../language-roles/enums/language-roles.enum';
import { filterPersistKey, updateArray } from '../../shared/utils/array.util';
@Injectable()
export class ResultLanguagesService {
  private mainRepo: Repository<ResultLanguage>;
  constructor(private dataSource: DataSource) {
    this.mainRepo = dataSource.getRepository(ResultLanguage);
  }

  async create(
    result_id: number,
    languages: Partial<ResultLanguage> | Partial<ResultLanguage>[],
    language_role_id: LanguageRolesEnum,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultLanguage> = selectManager(
      manager,
      ResultLanguage,
      this.mainRepo,
    );

    const languageArray = Array.isArray(languages) ? languages : [languages];
    const resulrLanguajeIds: number[] = languageArray.map(
      (data) => data.result_language_id,
    );
    const existData = await this.mainRepo.find({
      where: {
        result_id: result_id,
        language_role_id: language_role_id,
        language_id: In(resulrLanguajeIds),
      },
    });

    const formatDataUser: Partial<ResultLanguage>[] = languageArray.map(
      (data) => ({
        result_language_id: data?.result_language_id,
        language_role_id: language_role_id,
        language_id: data.language_id,
      }),
    );

    const updateResultLanguage = updateArray<ResultLanguage>(
      formatDataUser,
      existData,
      'language_id',
      {
        key: 'result_id',
        value: result_id,
      },
      'result_language_id',
    );

    const persistId = filterPersistKey<ResultLanguage>(
      'result_language_id',
      updateResultLanguage,
    );

    await entityManager.update(
      {
        result_id: result_id,
        result_language_id: Not(In(persistId)),
        language_role_id: language_role_id,
      },
      {
        is_active: false,
      },
    );

    const response = (await entityManager.save(updateResultLanguage)).filter(
      (data) => data.is_active === true,
    );

    return response;
  }
}
