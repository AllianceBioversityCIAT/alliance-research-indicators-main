import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AuditableEntity } from "../../../shared/global-dto/auditable.entity";
import { Result } from "../../results/entities/result.entity";
import { ProjectIndicator } from "../../project_indicators/entities/project_indicator.entity";

@Entity('project_indicators_results')
export class ProjectIndicatorsResult extends AuditableEntity{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => Result, result => result.projectIndicatorsResult, {
    onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'result_id' })
    result_id: Result;

    @ManyToOne(() => ProjectIndicator, projectIndicator => projectIndicator.indicatorPerItem, {
    onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'indicator_id' })
    indicator_id: ProjectIndicator;
}
