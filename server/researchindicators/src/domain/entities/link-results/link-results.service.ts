import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { LinkResult } from './entities/link-result.entity';
import { DataSource, Repository } from 'typeorm';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { CreateLinkResultDto } from './dto/create-link-result.dto';
import { ResultsService } from '../results/results.service';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { ResultContractsService } from '../result-contracts/result-contracts.service';

@Injectable()
export class LinkResultsService extends BaseServiceSimple<
  LinkResult,
  Repository<LinkResult>
> {
  constructor(
    dataSource: DataSource,
    currentUser: CurrentUserUtil,
    @Inject(forwardRef(() => ResultsService))
    private readonly _resultsService: ResultsService,
    private readonly resultContractsService: ResultContractsService,
  ) {
    super(
      LinkResult,
      dataSource.getRepository(LinkResult),
      'result_id',
      currentUser,
      'link_result_role_id',
    );
  }

  async findAndDetails(result_id: number, role_id: LinkResultRolesEnum) {
    const results = await this.mainRepo.find({
      where: { result_id, link_result_role_id: role_id, is_active: true },
      relations: {
        other_result: true,
      },
    });
    const otherResults =
      await this.resultContractsService.getPrincipalContractByResultsIds(
        results.map((lr) => lr.other_result_id),
      );

    results.forEach((lr) => {
      lr.other_result.result_contracts = otherResults.filter(
        (rc) => rc.result_id === lr.other_result_id,
      );
    });
    return results;
  }

  async saveLinkResults(
    resultId: number,
    body: CreateLinkResultDto,
    filterIndicatos: IndicatorsEnum[],
    role: LinkResultRolesEnum,
  ): Promise<CreateLinkResultDto> {
    const resultAvailable: Partial<LinkResult>[] = await this._resultsService
      .filterResultByIndicators(
        body?.link_results?.map((lr) => lr.other_result_id),
        filterIndicatos,
        true,
      )
      .then((res) =>
        res.map((id) => ({
          other_result_id: id,
        })),
      );

    const linkResult = await this.create(
      resultId,
      resultAvailable,
      'other_result_id',
      role,
    );
    return { link_results: linkResult };
  }
}
