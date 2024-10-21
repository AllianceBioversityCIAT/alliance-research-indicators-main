import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ClarisaLanguage } from './entities/clarisa-language.entity';
import { ControlListBaseService } from '../../../../shared/global-dto/clarisa-base-service';
@Injectable()
export class ClarisaLanguagesService extends ControlListBaseService<
  ClarisaLanguage,
  Repository<ClarisaLanguage>
> {
  constructor(dataSource: DataSource) {
    super(ClarisaLanguage, dataSource.getRepository(ClarisaLanguage));
  }
}
