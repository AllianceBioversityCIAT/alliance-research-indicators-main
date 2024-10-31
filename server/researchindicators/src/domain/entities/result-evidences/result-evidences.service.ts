import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultEvidence } from './entities/result-evidence.entity';
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

  async findPrincipalEvidence(
    resultId: number,
  ): Promise<CreateResultEvidenceDto> {
    const resultEvidences = await this.mainRepo.find({
      where: {
        evidence_role_id: EvidenceRoleEnum.PRINCIPAL_EVIDENCE,
        result_id: resultId,
        is_active: true,
      },
    });

    return {
      evidences: resultEvidences,
    };
  }
}
