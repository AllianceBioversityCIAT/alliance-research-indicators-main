import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import { LinkResult } from './entities/link-result.entity';
import { DataSource, Repository } from 'typeorm';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { CreateLinkResultDto } from './dto/create-link-result.dto';
import { ResultsService } from '../results/results.service';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';

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
    return this.mainRepo.find({
      where: { result_id, link_result_role_id: role_id, is_active: true },
      relations: {
        other_result: true,
      },
    });
  }

  async saveLinkResults(
    resultId: number,
    body: CreateLinkResultDto,
    filterIndicatos: IndicatorsEnum[],
    role: LinkResultRolesEnum,
  ): Promise<CreateLinkResultDto> {
    const resultAvailable: Partial<LinkResult>[] = await this._resultsService
      .filterResultByIndicators(
        body?.link_results?.map((lr) => lr.result_id),
        filterIndicatos,
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
