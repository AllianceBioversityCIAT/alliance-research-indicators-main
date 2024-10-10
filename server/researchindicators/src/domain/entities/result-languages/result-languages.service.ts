import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { selectManager } from '../../shared/utils/orm.util';
import { ResultLanguage } from './entities/result-language.entity';
import { LanguageRolesEnum } from '../language-roles/enums/language-roles.enum';
import {
  filterPersistKey,
  isNotEmpty,
  updateArray,
} from '../../shared/utils/array.util';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
@Injectable()
export class ResultLanguagesService extends BaseServiceSimple<
  ResultLanguage,
  Repository<ResultLanguage>
> {
  constructor(private dataSource: DataSource) {
    super(
      ResultLanguage,
      dataSource.getRepository(ResultLanguage),
      'result_id',
      'language_role_id',
    );
  }
}
