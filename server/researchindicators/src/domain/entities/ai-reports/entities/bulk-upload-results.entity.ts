import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultStatusEnum } from '../../result-status/enum/result-status.enum';
import { BulkUploadProcesses } from './bulk-upload-processes.entity';
import { Result } from '../../results/entities/result.entity';
import { Indicator } from '../../indicators/entities/indicator.entity';

@Entity('bulk_upload_results')
export class BulkUploadResults extends AuditableEntity {
    @PrimaryGeneratedColumn({
        name: 'id',
        type: 'bigint',
    })
    id!: number;

    @Column({
        name: 'bulk_upload_process_id',
        type: 'bigint',
    })
    bulk_upload_process_id!: number;

    @Column({
        name: 'result_id',
        type: 'bigint',
        nullable: true,
    })
    result_id?: number;

    @Column({
        name: 'missing_fields',
        type: 'json',
        nullable: true,
    })
    missing_fields?: string[];

    @Column({
        name: 'manual_intervention_occurred',
        type: 'boolean',
        nullable: true,
    })
    manual_intervention_occurred?: boolean;

    @Column({
        name: 'suggested_status',
        type: 'bigint',
        nullable: true,
    })
    suggested_status?: ResultStatusEnum;

    @Column({
        name: 'final_status',
        type: 'bigint',
        nullable: true,
    })
    final_status?: ResultStatusEnum;

    @Column({
        name: 'title',
        type: 'text',
        nullable: true,
    })
    title?: string;

    @Column({
        name: 'indicator_id',
        type: 'bigint',
        nullable: true,
    })
    indicator_id?: number;

    @Column({
        name: 'error_message',
        type: 'text',
        nullable: true,
    })
    error_message?: string;

    @ManyToOne(() => Indicator, (indicator) => indicator.bulkUploadResults)
    @JoinColumn({ name: 'indicator_id' })
    indicator?: Indicator;

    @ManyToOne(() => Result, (result) => result.bulkUploadResults)
    @JoinColumn({ name: 'result_id' })
    result?: Result;

    @ManyToOne(
        () => BulkUploadProcesses,
        (bulkUploadProcess) => bulkUploadProcess.bulkUploadResults,
    )
    @JoinColumn({ name: 'bulk_upload_process_id' })
    bulkUploadProcess!: BulkUploadProcesses;
}
