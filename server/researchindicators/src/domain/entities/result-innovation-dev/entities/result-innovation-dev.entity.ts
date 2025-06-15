import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaInnovationCharacteristic } from '../../../tools/clarisa/entities/clarisa-innovation-characteristics/entities/clarisa-innovation-characteristic.entity';
import { ClarisaInnovationType } from '../../../tools/clarisa/entities/clarisa-innovation-types/entities/clarisa-innovation-type.entity';
import { ClarisaInnovationReadinessLevel } from '../../../tools/clarisa/entities/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';
import { InnovationDevAnticipatedUser } from '../../innovation-dev-anticipated-users/entities/innovation-dev-anticipated-user.entity';

@Entity('result_innovation_dev')
export class ResultInnovationDev extends AuditableEntity {
  @PrimaryColumn({
    name: 'result_id',
    type: 'bigint',
  })
  result_id: number;

  @Column({
    name: 'short_title',
    type: 'text',
    nullable: true,
  })
  short_title?: string;

  @Column({
    name: 'innovation_nature_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_nature_id?: number;

  @Column({
    name: 'innovation_type_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_type_id?: number;

  @Column({
    name: 'innovation_readiness_id',
    type: 'bigint',
    nullable: true,
  })
  innovation_readiness_id?: number;

  @Column({
    name: 'no_sex_age_disaggregation',
    type: 'boolean',
    nullable: true,
  })
  no_sex_age_disaggregation?: boolean;

  @Column({
    name: 'anticipated_users_id',
    type: 'bigint',
    nullable: true,
  })
  anticipated_users_id?: number;

  @Column({
    name: 'expected_outcome',
    type: 'text',
    nullable: true,
  })
  expected_outcome?: string;

  @Column({
    name: 'intended_beneficiaries_description',
    type: 'text',
    nullable: true,
  })
  intended_beneficiaries_description?: string;

  @ManyToOne(() => Result, (result) => result.result_innovation_dev)
  @JoinColumn({
    name: 'result_id',
  })
  result?: Result;

  @ManyToOne(
    () => ClarisaInnovationCharacteristic,
    (characteristic) => characteristic.result_innovation_dev,
  )
  @JoinColumn({
    name: 'innovation_nature_id',
  })
  innovationNature?: ClarisaInnovationCharacteristic;

  @ManyToOne(() => ClarisaInnovationType, (type) => type.result_innovation_dev)
  @JoinColumn({
    name: 'innovation_type_id',
  })
  innovationType?: ClarisaInnovationType;

  @ManyToOne(
    () => ClarisaInnovationReadinessLevel,
    (readiness) => readiness.result_innovation_dev,
  )
  @JoinColumn({
    name: 'innovation_readiness_id',
  })
  innovationReadiness?: ClarisaInnovationReadinessLevel;

  @ManyToOne(
    () => InnovationDevAnticipatedUser,
    (user) => user.result_innovation_dev,
  )
  @JoinColumn({
    name: 'anticipated_users_id',
  })
  anticipatedUsers?: InnovationDevAnticipatedUser;
}
