import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { ResultEvidence } from './entities/result-evidence.entity';
import { selectManager } from '../../shared/utils/orm.util';
import { filterPersistKey, updateArray } from '../../shared/utils/array.util';
import { EvidenceRoleEnum } from '../evidence-roles/enums/evidence-role.enum';
import { CreateResultEvidenceDto } from './dto/create-result-evidence.dto';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
@Injectable()
export class ResultEvidencesService extends BaseServiceSimple<
  ResultEvidence,
  Repository<ResultEvidence>
> {
  constructor(private dataSource: DataSource) {
    super(
      ResultEvidence,
      dataSource.getRepository(ResultEvidence),
      'result_id',
      'evidence_role_id',
    );
  }

  async create2(
    result_id: number,
    evidences: Partial<ResultEvidence> | Partial<ResultEvidence>[],
    evidence_role_id: EvidenceRoleEnum,
    manager?: EntityManager,
  ) {
    const entityManager: Repository<ResultEvidence> = selectManager(
      manager,
      ResultEvidence,
      this.mainRepo,
    );

    const evidencesArray = Array.isArray(evidences) ? evidences : [evidences];
    const existData = await this.mainRepo.find({
      where: {
        result_id: result_id,
        evidence_role_id: evidence_role_id,
        evidence_url: In(evidencesArray.map((data) => data.evidence_url)),
      },
    });

    const formatDataEvidences: Partial<ResultEvidence>[] = evidencesArray.map(
      (data) => ({
        result_evidence_id: data?.result_evidence_id,
        evidence_role_id: evidence_role_id,
        evidence_url: data.evidence_url,
        evidence_description: data.evidence_description,
      }),
    );

    const updateResultEvidences = updateArray<ResultEvidence>(
      formatDataEvidences,
      existData,
      'evidence_url',
      {
        key: 'result_id',
        value: result_id,
      },
      'result_evidence_id',
    );

    const persistId = filterPersistKey<ResultEvidence>(
      'result_evidence_id',
      updateResultEvidences,
    );

    await entityManager.update(
      {
        result_id: result_id,
        result_evidence_id: Not(In(persistId)),
        evidence_role_id: evidence_role_id,
      },
      {
        is_active: false,
      },
    );

    const response = (await entityManager.save(updateResultEvidences)).filter(
      (data) => data.is_active === true,
    );

    return response;
  }

  async updateResultEvidences(
    resultId: number,
    resultEvidences: CreateResultEvidenceDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const { evidences } = resultEvidences;
      return await this.create(
        resultId,
        evidences,
        'evidence_url',
        EvidenceRoleEnum.PRINCIPAL_EVIDENCE,
        manager,
        ['evidence_description'],
      );
    });
  }
}
