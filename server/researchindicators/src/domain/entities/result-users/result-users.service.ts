import { Injectable } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { ResultUser } from './entities/result-user.entity';
import { UserRolesEnum } from '../user-roles/enum/user-roles.enum';
import { UserService } from '../../complementary-entities/secondary/user/user.service';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';
import {
  CurrentUserUtil,
  SetAutitEnum,
} from '../../shared/utils/current-user.util';
import { ResultUserAi } from './entities/result-user-ai.entity';
import { isEmpty } from 'lodash';
import { selectManager } from '../../shared/utils/orm.util';
import { AiRawUser } from '../results/dto/result-ai.dto';
import { SaveAuthorContcatDto } from './dto/save-author-contact.dto';
import { InformativeRolesEnum } from '../informative-roles/enum/informative-roles.enum';
@Injectable()
export class ResultUsersService extends BaseServiceSimple<
  ResultUser,
  Repository<ResultUser>
> {
  constructor(
    private readonly dataSource: DataSource,
    private readonly _userService: UserService,
    currentUser: CurrentUserUtil,
  ) {
    super(
      ResultUser,
      dataSource.getRepository(ResultUser),
      'result_id',
      currentUser,
      'user_role_id',
    );
  }

  async findAuthorContactUserByResultId(resultId: number) {
    return this.mainRepo.find({
      where: {
        result_id: resultId,
        user_role_id: UserRolesEnum.AUTHORS_CONTACT,
        is_active: true,
      },
      relations: {
        user: true,
        informativeRole: true,
      },
    });
  }

  async deleteAuthorContactByResultIdAndKey(resultId: number, key: number) {
    return this.mainRepo.update(
      {
        result_user_id: key,
        result_id: resultId,
        user_role_id: UserRolesEnum.AUTHORS_CONTACT,
      },
      { is_active: false, ...this.currentUser.audit(SetAutitEnum.UPDATE) },
    );
  }

  async saveAuthorContactUserByResultId(
    resultId: number,
    body: SaveAuthorContcatDto,
  ) {
    return await this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(ResultUser);

      const existingRoles = await repository.find({
        where: {
          result_id: resultId,
          user_id: body.user_id,
          user_role_id: UserRolesEnum.AUTHORS_CONTACT,
          is_active: true,
        },
      });

      const newInformativeRole = body.informative_role_id;

      if (newInformativeRole === InformativeRolesEnum.BOTH) {
        return await this.handleBothRole(
          repository,
          resultId,
          body.user_id,
          existingRoles,
        );
      }

      if (
        newInformativeRole === InformativeRolesEnum.AUTHOR ||
        newInformativeRole === InformativeRolesEnum.CONTACT_PERSON
      ) {
        return await this.handleIndividualRole(
          repository,
          resultId,
          body.user_id,
          newInformativeRole,
          existingRoles,
        );
      }

      throw new Error('Invalid informative_role_id provided');
    });
  }

  private async handleBothRole(
    repository: Repository<ResultUser>,
    resultId: number,
    targetUserId: string,
    existingRoles: ResultUser[],
  ): Promise<ResultUser> {
    const existingBothRole = this.findRoleByType(
      existingRoles,
      InformativeRolesEnum.BOTH,
    );

    if (existingBothRole) {
      return existingBothRole;
    }

    await this.deactivateIndividualRoles(repository, existingRoles);

    return await this.upsertAuthorContactRole(
      repository,
      resultId,
      targetUserId,
      InformativeRolesEnum.BOTH,
    );
  }

  private async handleIndividualRole(
    repository: Repository<ResultUser>,
    resultId: number,
    targetUserId: string,
    newInformativeRole: InformativeRolesEnum,
    existingRoles: ResultUser[],
  ): Promise<ResultUser> {
    const existingInformativeRoles = existingRoles.map(
      (role) => role.informative_role_id,
    );

    const hasBoth = existingInformativeRoles.includes(
      InformativeRolesEnum.BOTH,
    );

    if (hasBoth) {
      return await this.replaceBothWithIndividual(
        repository,
        resultId,
        targetUserId,
        newInformativeRole,
        existingRoles,
      );
    }

    const shouldUpgradeToBoth = this.shouldUpgradeToBothRole(
      newInformativeRole,
      existingInformativeRoles,
    );

    if (shouldUpgradeToBoth) {
      await this.deactivateIndividualRoles(repository, existingRoles);
      return await this.upsertAuthorContactRole(
        repository,
        resultId,
        targetUserId,
        InformativeRolesEnum.BOTH,
      );
    }

    return await this.upsertAuthorContactRole(
      repository,
      resultId,
      targetUserId,
      newInformativeRole,
    );
  }

  private async replaceBothWithIndividual(
    repository: Repository<ResultUser>,
    resultId: number,
    targetUserId: string,
    newInformativeRole: InformativeRolesEnum,
    existingRoles: ResultUser[],
  ): Promise<ResultUser> {
    const bothRole = this.findRoleByType(
      existingRoles,
      InformativeRolesEnum.BOTH,
    );

    if (bothRole) {
      await repository.update(bothRole.result_user_id, {
        is_active: false,
      });
    }

    return await this.upsertAuthorContactRole(
      repository,
      resultId,
      targetUserId,
      newInformativeRole,
    );
  }

  private findRoleByType(
    existingRoles: ResultUser[],
    roleType: InformativeRolesEnum,
  ): ResultUser | undefined {
    return existingRoles.find((role) => role.informative_role_id === roleType);
  }

  private async deactivateIndividualRoles(
    repository: Repository<ResultUser>,
    existingRoles: ResultUser[],
  ): Promise<void> {
    const individualRoles = existingRoles.filter(
      (role) => role.informative_role_id !== InformativeRolesEnum.BOTH,
    );

    if (individualRoles.length > 0) {
      const individualRoleIds = individualRoles.map(
        (role) => role.result_user_id,
      );
      await repository.update(individualRoleIds, { is_active: false });
    }
  }

  private shouldUpgradeToBothRole(
    newInformativeRole: InformativeRolesEnum,
    existingInformativeRoles: InformativeRolesEnum[],
  ): boolean {
    const hasAuthor = existingInformativeRoles.includes(
      InformativeRolesEnum.AUTHOR,
    );
    const hasContact = existingInformativeRoles.includes(
      InformativeRolesEnum.CONTACT_PERSON,
    );

    return (
      (newInformativeRole === InformativeRolesEnum.AUTHOR && hasContact) ||
      (newInformativeRole === InformativeRolesEnum.CONTACT_PERSON && hasAuthor)
    );
  }

  private async upsertAuthorContactRole(
    repository: Repository<ResultUser>,
    resultId: number,
    targetUserId: string,
    informativeRoleId: InformativeRolesEnum,
  ): Promise<ResultUser> {
    const existingRole = await repository.findOne({
      where: {
        result_id: resultId,
        user_id: targetUserId,
        user_role_id: UserRolesEnum.AUTHORS_CONTACT,
        informative_role_id: informativeRoleId,
      },
    });

    if (existingRole) {
      if (!existingRole.is_active) {
        await repository.update(existingRole.result_user_id, {
          is_active: true,
          ...this.currentUser.audit(SetAutitEnum.UPDATE),
        });
        return await repository.findOne({
          where: { result_user_id: existingRole.result_user_id },
        });
      }
      return existingRole;
    } else {
      const newRole = repository.create({
        result_id: resultId,
        user_id: targetUserId,
        user_role_id: UserRolesEnum.AUTHORS_CONTACT,
        informative_role_id: informativeRoleId,
        is_active: true,
        ...this.currentUser.audit(SetAutitEnum.NEW),
      });

      return await repository.save(newRole);
    }
  }

  filterInstitutionsAi(
    users: AiRawUser[],
    user_role: UserRolesEnum,
  ): {
    acept: Partial<ResultUser>[];
    pending: Partial<ResultUserAi>[];
  } {
    if (isEmpty(users)) return { acept: [], pending: [] };
    const aceptUsers: Partial<ResultUser>[] = [];
    const pendingUsers: Partial<ResultUserAi>[] = [];
    for (const user of users) {
      if (parseInt(user.similarity_score) >= 70 && user?.code)
        aceptUsers.push({
          user_id: user.code,
        });
      else
        pendingUsers.push({
          user_code: user?.code ? user.code : null,
          user_role_id: user_role,
          user_name: user.name,
          score: parseInt(user.similarity_score),
        });
    }

    return {
      acept: !isEmpty(aceptUsers) ? aceptUsers : [],
      pending: !isEmpty(pendingUsers) ? pendingUsers : [],
    };
  }

  async insertUserAi(
    resultId: number,
    users: ResultUserAi[],
    user_role: UserRolesEnum,
    manager?: EntityManager,
  ) {
    if (isEmpty(users)) return null;
    const useManager = selectManager<ResultUserAi>(
      manager,
      ResultUserAi,
      this.dataSource.getRepository(ResultUserAi),
    );
    return useManager.save(
      users.map((user) => ({
        result_id: resultId,
        user_code: user.user_code,
        user_role_id: user_role,
        user_name: user.user_name,
        score: user.score,
      })),
    );
  }

  async findUsersByRoleResult(role: UserRolesEnum, resultId: number) {
    const resultUsers = await this.mainRepo.find({
      where: {
        user_role_id: role,
        result_id: resultId,
        is_active: true,
      },
      relations: {
        user: true,
      },
    });

    return resultUsers;
  }
}
