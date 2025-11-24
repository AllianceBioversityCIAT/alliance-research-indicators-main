import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultEvidence } from './entities/result-evidence.entity';
import { EvidenceRoleEnum } from '../evidence-roles/enums/evidence-role.enum';
import { CreateResultEvidenceDto } from './dto/create-result-evidence.dto';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { isEmpty } from '../../shared/utils/object.utils';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ResultNotableReferencesService } from '../result-notable-references/result-notable-references.service';
import { ResultsUtil } from '../../shared/utils/results.util';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
@Injectable()
export class ResultEvidencesService extends BaseServiceSimple<
  ResultEvidence,
  Repository<ResultEvidence>
> {
  constructor(
    private dataSource: DataSource,
    currentUser: CurrentUserUtil,
    private readonly _updateDataUtil: UpdateDataUtil,
    private readonly resultNotableReferencesService: ResultNotableReferencesService,
    private readonly _resultsUtil: ResultsUtil,
  ) {
    super(
      ResultEvidence,
      dataSource.getRepository(ResultEvidence),
      'result_id',
      currentUser,
      'evidence_role_id',
    );
  }

  async updateResultEvidences(
    resultId: number,
    resultEvidences: CreateResultEvidenceDto,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const filterEvidence = resultEvidences?.evidence?.filter(
        (el) =>
          !isEmpty(el?.evidence_description) || !isEmpty(el?.evidence_url),
      );

      if (this._resultsUtil.indicatorId == IndicatorsEnum.OICR) {
        const filterNotableReferences =
          resultEvidences?.notable_references?.filter(
            (el) =>
              !isEmpty(el?.link) || !isEmpty(el?.notable_reference_type_id),
          );

        await this.resultNotableReferencesService.upsertByCompositeKeys(
          resultId,
          filterNotableReferences ?? [],
          ['notable_reference_type_id', 'link'],
        );
      }

      return await this.create(
        resultId,
        filterEvidence,
        'evidence_url',
        EvidenceRoleEnum.PRINCIPAL_EVIDENCE,
        manager,
        ['evidence_description', 'is_private'],
      ).then(async (result) => {
        await this._updateDataUtil.updateLastUpdatedDate(resultId, manager);
        return result;
      });
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

    const returnEvidences = {
      evidence: resultEvidences,
      notable_references: null,
    };

    if (this._resultsUtil.indicatorId == IndicatorsEnum.OICR) {
      const notableReferences =
        await this.resultNotableReferencesService.find(resultId);
      returnEvidences.notable_references = notableReferences;
    }

    return returnEvidences;
  }
}
