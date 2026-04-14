import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateLeverSdgTargetDto } from './dto/create-lever-sdg-target.dto';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { DataSource, Repository } from 'typeorm';
import { LeverSdgTarget } from './entities/lever-sdg-target.entity';
import { CgiarLogger } from '../../shared/utils/cgiar-logs/logs.util';
import { sqlErrorsHelper } from '../../shared/const/sql-errors.const';
import { BaseServiceSimple } from '../../shared/global-dto/base-service';

@Injectable()
export class LeverSdgTargetsService extends BaseServiceSimple<
  LeverSdgTarget,
  Repository<LeverSdgTarget>
> {
  private readonly logger: CgiarLogger = new CgiarLogger(
    LeverSdgTargetsService.name,
  );

  constructor(
    private readonly dataSource: DataSource,
    public readonly currentUser: CurrentUserUtil,
  ) {
    super(
      LeverSdgTarget,
      dataSource.getRepository(LeverSdgTarget),
      'lever_id',
      currentUser,
    );
  }

  async createDataTransaction(
    createLeverSdgTargetDto: CreateLeverSdgTargetDto,
  ) {
    return this.dataSource
      .transaction(async (manager) => {
        const byLever: Record<number, number[]> = {};
        for (const {
          lever_id,
          sdg_target_id,
        } of createLeverSdgTargetDto.leverSdgTargetList) {
          byLever[lever_id] ??= [];
          byLever[lever_id].push(sdg_target_id);
        }
        for (const [lever_id, sdg_target_ids] of Object.entries(byLever)) {
          await this.create(
            Number(lever_id),
            sdg_target_ids.map((sdg_target_id) => ({
              sdg_target_id: sdg_target_id,
            })),
            'sdg_target_id',
            undefined,
            manager,
          );
        }
      })
      .catch((error) => {
        this.logger.error(JSON.stringify(error?.driverError ?? error, null, 2));
        const errorObject = sqlErrorsHelper(error);
        throw new BadRequestException(
          `Error creating lever sdg targets: ${errorObject.friendlyName} - ${errorObject.message}`,
        );
      });
  }

  async softDelete(id: number) {
    return this.mainRepo
      .update(id, {
        is_active: false,
        deleted_at: new Date(),
        ...this.currentUser.audit(SetAuditEnum.UPDATE),
      })
      .then((res) => {
        if (res.affected === 0) {
          throw new NotFoundException('Lever sdg target not found');
        }
        return res;
      })
      .catch((error) => {
        this.logger.error(JSON.stringify(error?.driverError ?? error, null, 2));
        const errorObject = sqlErrorsHelper(error);
        throw new BadRequestException(
          `Error deleting lever sdg target: ${errorObject.friendlyName} - ${errorObject.message}`,
        );
      });
  }

  async findAll() {
    return this.mainRepo.find({
      select: {
        id: true,
        lever: {
          id: true,
          short_name: true,
          full_name: true,
        },
        sdg_target: {
          id: true,
          sdg_target_code: true,
          sdg_target: true,
        },
      },
      relations: {
        lever: true,
        sdg_target: true,
      },
    });
  }

  async findByLeverId(leverId: number, onlySdgTargets: boolean = false) {
    return this.mainRepo
      .find({
        select: {
          id: true,
          sdg_target: {
            id: true,
            sdg_target_code: true,
            sdg_target: true,
            clarisa_sdg: {
              id: true,
              short_name: true,
              full_name: true,
              icon: true,
              color: true,
              description: true,
            },
          },
          lever: {
            id: true,
            short_name: true,
            full_name: true,
          },
        },
        where: {
          lever_id: leverId,
        },
        relations: {
          sdg_target: {
            clarisa_sdg: true,
          },
          ...(onlySdgTargets ? {} : { lever: true }),
        },
      })
      .then((res) => {
        if (onlySdgTargets) {
          return res.map((el) => el.sdg_target);
        }
        return res;
      });
  }
}
