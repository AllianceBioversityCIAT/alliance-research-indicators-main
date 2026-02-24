import {
    CurrentUserUtil,
    SetAuditEnum,
} from '../../../shared/utils/current-user.util';
import { SyncProcessLog } from '../entities/sync-process-log.entity';
import { SyncProcessEnum, SyncProcessStatusEnum } from '../enum/sync-process.enum';

export class CreateSyncProcessDto {
    processName: SyncProcessEnum;
    createdRecords: number;
    updatedRecords: number;
    totalRecords: number;
    successRecords: number;
    errorRecords: number;
    processStatus: SyncProcessStatusEnum;

    static fromEntity(
        entity: CreateSyncProcessDto,
        currentUser: CurrentUserUtil,
    ): Partial<SyncProcessLog> {
        return {
            process_name: SyncProcessEnum[entity.processName],
            created_records: entity?.createdRecords ?? 0,
            updated_records: entity.updatedRecords ?? 0,
            total_records: entity?.totalRecords ?? 0,
            success_records: entity?.successRecords ?? 0,
            error_records: entity?.errorRecords ?? 0,
            ...currentUser.audit(SetAuditEnum.BOTH),
        };
    }

    static fromEntityUpdate(
        entity: Partial<CreateSyncProcessDto>,
        syncProcessLog: SyncProcessLog,
        currentUser: CurrentUserUtil,
    ): Partial<SyncProcessLog> {

        const incrementCounter = (data: number, increment: number): number => {
            return (data ?? 0) + (increment ?? 0);
        };

        return {
            created_records: incrementCounter(syncProcessLog.created_records, entity?.createdRecords),
            updated_records: incrementCounter(syncProcessLog.updated_records, entity?.updatedRecords),
            error_records: incrementCounter(syncProcessLog.error_records, entity?.errorRecords),
            ...currentUser.audit(SetAuditEnum.UPDATE),
        };
    }
}
