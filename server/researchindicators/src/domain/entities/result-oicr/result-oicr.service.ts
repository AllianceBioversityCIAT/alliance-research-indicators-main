import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { ResultOicr } from './entities/result-oicr.entity';
import { StepOneOicrDto } from './dto/step-one-oicr.dto';
import { ResultTagsService } from '../result-tags/result-tags.service';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { ResultUsersService } from '../result-users/result-users.service';
import { ResultUser } from '../result-users/entities/result-user.entity';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { ResultTag } from '../result-tags/entities/result-tag.entity';
import { LinkResult } from '../link-results/entities/link-result.entity';
import { LinkResultRolesEnum } from '../link-result-roles/enum/link-result-roles.enum';
import { LinkResultsService } from '../link-results/link-results.service';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ResultInitiativesService } from '../result-initiatives/result-initiatives.service';
import { StepTwoOicrDto } from './dto/step-two-oicr.dto';
import { ResultInitiative } from '../result-initiatives/entities/result-initiative.entity';
import { ResultLeversService } from '../result-levers/result-levers.service';
import { ResultLever } from '../result-levers/entities/result-lever.entity';

@Injectable()
export class ResultOicrService {
  private readonly mainRepo: Repository<ResultOicr>;
  constructor(
    private readonly dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
    private readonly resultTagsService: ResultTagsService,
    private readonly resultUsersService: ResultUsersService,
    private readonly linkResultService: LinkResultsService,
    private readonly updateDataUtil: UpdateDataUtil,
    private readonly resultInitiativesService: ResultInitiativesService,
    private readonly resultLeversService: ResultLeversService,
  ) {
    this.mainRepo = this.dataSource.getRepository(ResultOicr);
  }

  async create(resultId: number) {
    const newResultOicr = this.mainRepo.create({
      result_id: resultId,
    });
    return this.mainRepo.save(newResultOicr);
  }

  async createOicrSteps(resultId: number) {
    await this.updateDataUtil.updateLastUpdatedDate(resultId);
  }

  async stepTwoOicr(data: StepTwoOicrDto, resultId: number) {
    this.dataSource.transaction(async (manager) => {
      const saveInitiatives: Partial<ResultInitiative>[] = data.initiatives.map(
        (initiative) => ({
          clarisa_initiative_id: initiative.clarisa_initiative_id,
        }),
      );
      await this.resultInitiativesService.create(
        resultId,
        saveInitiatives,
        'clarisa_initiative_id',
        undefined,
        manager,
      );

      const savePrimaryLevers: Partial<ResultLever>[] = data.primary_lever.map(
        (lever) => ({
          lever_id: lever.lever_id,
          is_primary: true,
        }),
      );

      const saveContributorLevers: Partial<ResultLever>[] =
        data.contributor_lever.map((lever) => ({
          lever_id: lever.lever_id,
          is_primary: false,
        }));

      const allLevers = [...savePrimaryLevers, ...saveContributorLevers];

      await this.resultLeversService.create(
        resultId,
        allLevers,
        'lever_id',
        undefined,
        manager,
        ['is_primary'],
      );
    });
  }

  async stepOneOicr(data: StepOneOicrDto, resultId: number) {
    await this.dataSource.transaction(async (manager) => {
      const saveUsers: Partial<ResultUser> = {
        user_id: data?.main_contact_person?.user_id,
      };
      await this.resultUsersService.create(
        resultId,
        saveUsers,
        'user_id',
        UserRolesEnum.MAIN_CONTACT,
        manager,
      );

      const saveTags: Partial<ResultTag>[] = data?.tagging?.map((tag) => ({
        tag_id: tag.tag_id,
      }));
      const createdTags = await this.resultTagsService.create(
        resultId,
        saveTags,
        'tag_id',
        undefined,
        manager,
      );

      const saveLinkedResults: Partial<LinkResult>[] = createdTags?.length
        ? data?.linked_result?.map((link) => ({
            other_result_id: link.other_result_id,
          }))
        : [];
      await this.linkResultService.create(
        resultId,
        saveLinkedResults,
        'other_result_id',
        LinkResultRolesEnum.OICR_STEP_ONE,
        manager,
      );

      await this.mainRepo.update(resultId, {
        outcome_impact_statement: data.outcome_impact_statement,
        ...this.currentUser.audit(SetAutitEnum.UPDATE),
      });
    });
  }
}
