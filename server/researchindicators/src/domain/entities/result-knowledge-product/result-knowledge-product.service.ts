import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultKnowledgeProduct } from './entities/result-knowledge-product.entity';
import { selectManager } from '../../shared/utils/orm.util';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';

@Injectable()
export class ResultKnowledgeProductService {
  private readonly mainRepo: Repository<ResultKnowledgeProduct>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly _currentUser: CurrentUserUtil,
  ) {
    this.mainRepo = this.dataSource.getRepository(ResultKnowledgeProduct);
  }

  async create(resultId: number, manager?: EntityManager) {
    const entityManager: Repository<ResultKnowledgeProduct> = selectManager(
      manager,
      ResultKnowledgeProduct,
      this.mainRepo,
    );

    return entityManager.save({
      result_id: resultId,
      ...this._currentUser.audit(SetAutitEnum.NEW),
    });
  }

  async update(resultId: number, data: ResultKnowledgeProduct) {
    await this.mainRepo.update(resultId, {
      open_access: data.open_access,
      citation: data.citation,
      publication_date: data.publication_date,
      type: data.type,
      ...this._currentUser.audit(SetAutitEnum.UPDATE),
    });
    return this.mainRepo.findOne({ where: { result_id: resultId } });
  }
}
