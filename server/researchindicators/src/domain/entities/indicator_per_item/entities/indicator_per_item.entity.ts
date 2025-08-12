import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { GroupItem } from "../../groups_items/entities/groups_item.entity";
import { ProjectIndicator } from "../../project_indicators/entities/project_indicator.entity";
import { AuditableEntity } from "../../../shared/global-dto/auditable.entity";

@Entity('indicator_per_item')
export class IndicatorPerItem extends AuditableEntity{
    @PrimaryGeneratedColumn()
    id: number;

    @ManyToOne(() => GroupItem, groupItem => groupItem.indicatorPerItem, {
    onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'group_item_id' })
    groupItem: GroupItem;

    @ManyToOne(() => ProjectIndicator, projectIndicator => projectIndicator.indicatorPerItem, {
    onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'project_indicator_id' })
    projectIndicator: ProjectIndicator;
}
