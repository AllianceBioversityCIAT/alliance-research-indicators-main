import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SyncProcessLog } from './entities/sync-process-log.entity';
import { DataSource, Repository } from 'typeorm';
import { CreateSyncProcessDto } from './dto/create-sync-procees.dto';
import {
  CurrentUserUtil,
  SetAuditEnum,
} from '../../shared/utils/current-user.util';
import { SyncProcessEnum, SyncProcessStatusEnum } from './enum/sync-process.enum';
import { LoggerUtil } from '../../shared/utils/logger.util';

@Injectable()
export class SyncProcessLogService {
  private readonly mainRepo: Repository<SyncProcessLog>;
  private readonly logger: LoggerUtil = new LoggerUtil({
    name: 'SyncProcessLogService',
  });
  constructor(
    private readonly dataSource: DataSource,
    private readonly currentUser: CurrentUserUtil,
  ) {
    this.mainRepo = this.dataSource.getRepository(SyncProcessLog);
  }

  async initiateSync(syncName: SyncProcessEnum) {
    const syncProcessLog = CreateSyncProcessDto.fromEntity(
      {
        processName: syncName,
        processStatus: SyncProcessStatusEnum.IN_PROGRESS,
        createdRecords: 0,
        updatedRecords: 0,
        totalRecords: 0,
        successRecords: 0,
        errorRecords: 0,
      },
      this.currentUser,
    );
    const result = await this.mainRepo.insert(syncProcessLog).catch(() => {
      throw new BadRequestException(`Error creating sync process log`);
    });
    return this.mainRepo.findOne({ where: { id: result.identifiers[0].id } });
  }

  async update(
    id: number,
    updateSyncProcessDto: Partial<CreateSyncProcessDto>,
  ) {
    const syncProcessLog = await this.mainRepo.findOne({ where: { id } });
    if (!syncProcessLog) {
      throw new NotFoundException(`Sync process log not found`);
    }
    const syncProcessLogUpdated = CreateSyncProcessDto.fromEntityUpdate(
      updateSyncProcessDto,
      syncProcessLog,
      this.currentUser,
    );
    await this.mainRepo.update(id, syncProcessLogUpdated).catch(() => {
      throw new BadRequestException(`Error updating sync process log`);
    });
    this.logger.debug(
      `Sync process log updated:\n created: ${syncProcessLogUpdated.created_records}\n updated: ${syncProcessLogUpdated.updated_records}\n error: ${syncProcessLogUpdated.error_records}`,
    );
    return this.mainRepo.findOne({ where: { id } });
  }

  async endSync(id: number) {
    const syncProcessLog = await this.mainRepo.findOne({ where: { id } });
    if (!syncProcessLog) {
      throw new NotFoundException(`Sync process log not found`);
    }
    await this.mainRepo
      .update(id, {
        ...syncProcessLog,
        ...this.currentUser.audit(SetAuditEnum.UPDATE),
        total_records:
          syncProcessLog.created_records +
          syncProcessLog.updated_records +
          syncProcessLog.error_records,
        success_records:
          syncProcessLog.created_records + syncProcessLog.updated_records,
        process_status: SyncProcessStatusEnum.COMPLETED,
      })
      .catch(() => {
        throw new BadRequestException(`Error updating sync process log`);
      });
    const syncProcessLogEnded = await this.mainRepo.findOne({ where: { id } });
    this.logger.debug(`Sync process log ended:\n created: ${syncProcessLogEnded.created_records}\n updated: ${syncProcessLogEnded.updated_records}\n error: ${syncProcessLogEnded.error_records}\n total: ${syncProcessLogEnded.total_records}\n success: ${syncProcessLogEnded.success_records}`);
    return syncProcessLogEnded;
  }
}
