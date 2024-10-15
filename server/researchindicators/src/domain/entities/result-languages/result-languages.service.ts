import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultLanguage } from './entities/result-language.entity';
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
