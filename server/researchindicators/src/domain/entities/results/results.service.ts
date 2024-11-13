import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager, In } from 'typeorm';
import { ResultRepository } from './repositories/result.repository';
import { PaginationDto } from '../../shared/global-dto/pagination.dto';
import { cleanObject, validObject } from '../../shared/utils/object.utils';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { Result } from './entities/result.entity';
import { CreateResultDto } from './dto/create-result.dto';
import { ResultContractsService } from '../result-contracts/result-contracts.service';
import { ContractRolesEnum } from '../result-contracts/enum/contract-roles.enum';
import { ResultLeversService } from '../result-levers/result-levers.service';
import { LeverRolesEnum } from '../lever-roles/enum/lever-roles.enum';
import { UpdateGeneralInformation } from './dto/update-general-information.dto';
import { ResultKeywordsService } from '../result-keywords/result-keywords.service';
import { ResultUsersService } from '../result-users/result-users.service';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { ResultCapacitySharingService } from '../result-capacity-sharing/result-capacity-sharing.service';
import { DataReturnEnum } from '../../shared/enum/queries.enum';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';
import { ResultAlignmentDto } from './dto/result-alignment.dto';
import { UserRole } from '../user-roles/entities/user-role.entity';
import { ResultContract } from '../result-contracts/entities/result-contract.entity';
import { MetadataResultDto } from './dto/metadata-result.dto';

@Injectable()
export class ResultsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly mainRepo: ResultRepository,
    private readonly _resultContractsService: ResultContractsService,
    private readonly _resultLeversService: ResultLeversService,
    private readonly _resultKeywordsService: ResultKeywordsService,
    private readonly _resultUsersService: ResultUsersService,
    private readonly _resultCapacitySharingService: ResultCapacitySharingService,
  ) {}

  async findResults(pagination: PaginationDto) {
    const paginationClean = cleanObject<PaginationDto>(pagination);
    const whereLimit: Record<string, number> = {};
    if (Object.keys(paginationClean).length === 2) {
      const offset = (paginationClean.page - 1) * paginationClean.limit;
      whereLimit.limit = paginationClean.limit;
      whereLimit.offset = offset;
    }
    return this.mainRepo.find({
      ...whereLimit,
      where: {
        is_active: true,
      },
    });
  }

  async createResult(createResult: CreateResultDto): Promise<Result> {
    const { invalidFields, isValid } = validObject(createResult, [
      'contract_id',
      'indicator_id',
      'title',
    ]);

    if (!isValid) {
      throw new BadRequestException(`Invalid fields: ${invalidFields}`);
    }

    const { description, indicator_id, title, contract_id } = createResult;

    await this.mainRepo.findOne({ where: { title } }).then((result) => {
      if (result) {
        throw new ConflictException(
          'The name of the result is already registered',
        );
      }
    });

    const newOfficialCode = await this.newOfficialCode();

    const result = await this.dataSource.transaction(async (manager) => {
      const result = await manager.getRepository(this.mainRepo.target).save({
        description,
        indicator_id,
        title,
        result_official_code: newOfficialCode,
      });

      await this.createResultType(
        result.result_id,
        result.indicator_id,
        manager,
      );

      const primaryContract: Partial<ResultContract> = {
        contract_id: contract_id,
        is_primary: true,
      };

      await this._resultContractsService.create<ContractRolesEnum>(
        result.result_id,
        primaryContract,
        'contract_id',
        ContractRolesEnum.ALIGNMENT,
        manager,
        ['is_primary'],
      );

      return result;
    });

    return result;
  }

  private async newOfficialCode() {
    const firstInsertion: number = 1;
    const lastCode: number = await this.mainRepo
      .findOne({
        where: { is_active: In([true, false]) },
        order: { result_official_code: 'DESC' },
      })
      .then((result) => {
        return result?.result_official_code
          ? result.result_official_code + 1
          : firstInsertion;
      });

    return lastCode;
  }

  private async createResultType(
    resultId: number,
    indicator: IndicatorsEnum,
    manager?: EntityManager,
  ) {
    switch (indicator) {
      case IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT:
        await this._resultCapacitySharingService.create(resultId, manager);
        break;
      default:
        break;
    }
  }

  async deleteResult(result_id: number): Promise<Result> {
    const result = await this.mainRepo
      .findOne({ where: { result_id } })
      .then((result) => {
        if (!result) {
          throw ResponseUtils.format({
            description: 'Result not found',
            status: HttpStatus.NOT_FOUND,
          });
        }
        return result;
      });

    await this.dataSource.transaction(async (manager) => {
      await this._resultContractsService.deleteAll(result_id, manager);
      await this._resultLeversService.deleteAll(result_id, manager);
      await manager.withRepository(this.mainRepo).delete(result_id);
    });

    return result;
  }

  async updateGeneralInfo(
    result_id: number,
    generalInformation: UpdateGeneralInformation,
    returnData: DataReturnEnum = DataReturnEnum.FALSE,
  ) {
    return this.dataSource.transaction(async (manager) => {
      await manager.getRepository(this.mainRepo.target).update(result_id, {
        title: generalInformation.title,
        description: generalInformation.description,
      });

      const keywordsToSave = this._resultKeywordsService.transformData(
        generalInformation.keywords,
      );

      await this._resultKeywordsService.create<null>(
        result_id,
        keywordsToSave,
        'keyword',
        null,
        manager,
      );
      let mainContractPerson: Partial<UserRole> = null;
      if (Array.isArray(generalInformation.main_contract_person)) {
        mainContractPerson =
          generalInformation.main_contract_person.length > 0
            ? generalInformation.main_contract_person[0]
            : null;
      } else {
        mainContractPerson = generalInformation.main_contract_person;
      }
      await this._resultUsersService.create<UserRolesEnum>(
        result_id,
        mainContractPerson,
        'user_id',
        UserRolesEnum.MAIN_CONTACT,
        manager,
      );

      if (returnData === DataReturnEnum.TRUE) {
        return this.findGeneralInfo(result_id);
      }

      return undefined;
    });
  }

  async findGeneralInfo(resultId: number) {
    const result = await this.mainRepo.findOne({
      select: ['title', 'description', 'result_id'],
      where: { result_id: resultId, is_active: true },
    });

    const keywords =
      await this._resultKeywordsService.findKeywordsByResultId(resultId);

    const mainContractPerson = await this._resultUsersService
      .findUsersByRoleResult(UserRolesEnum.MAIN_CONTACT, resultId, true)
      .then((data) => (data?.length > 0 ? data[0] : null));

    const generalInformation: UpdateGeneralInformation = {
      ...result,
      keywords: keywords.map((keyword) => keyword.keyword),
      main_contract_person: mainContractPerson,
    };

    return generalInformation;
  }

  async updateResultAlignment(
    resultId: number,
    alignmentData: ResultAlignmentDto,
    returnData: DataReturnEnum = DataReturnEnum.FALSE,
  ) {
    const { contracts, levers } = alignmentData;
    this.dataSource.transaction(async (manager) => {
      await this._resultContractsService.create<ContractRolesEnum>(
        resultId,
        contracts,
        'contract_id',
        ContractRolesEnum.ALIGNMENT,
        manager,
        ['is_primary'],
      );

      await this._resultLeversService.create<LeverRolesEnum>(
        resultId,
        levers,
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        manager,
        ['is_primary'],
      );
    });

    if (returnData === DataReturnEnum.TRUE) {
      return this.findResultAlignment(resultId);
    }

    return undefined;
  }

  async findResultAlignment(resultId: number) {
    const contracts = await this._resultContractsService.find(
      resultId,
      ContractRolesEnum.ALIGNMENT,
    );

    const levers = await this._resultLeversService.find(
      resultId,
      LeverRolesEnum.ALIGNMENT,
    );

    const resultAlignment: ResultAlignmentDto = {
      contracts,
      levers,
    };

    return resultAlignment;
  }

  async findMetadataResult(result_id: number): Promise<MetadataResultDto> {
    const result = await this.mainRepo.findOne({
      where: { result_id, is_active: true },
      relations: {
        indicator: true,
      },
    });

    return {
      indicator_id: result.indicator.indicator_id,
      indicator_name: result.indicator.name,
      result_id: result.result_id,
      result_official_code: result.result_official_code,
      status_id: 1, //TODO: Change this to the real status
      status_name: 'Editing', //TODO: Change this to the real status
    };
  }

  async validateIndicator(
    result_id: number,
    indicator: IndicatorsEnum,
  ): Promise<boolean> {
    return this.mainRepo
      .findOne({ where: { result_id, indicator_id: indicator } })
      .then((result) => result != null);
  }
}
