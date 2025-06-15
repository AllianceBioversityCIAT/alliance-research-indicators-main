import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaActorType } from '../../../tools/clarisa/entities/clarisa-actor-types/entities/clarisa-actor-type.entity';
import { ActorRole } from '../../actor-roles/entities/actor-role.entity';

@Entity('result_actors')
export class ResultActor extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'result_actors_id',
    type: 'bigint',
  })
  result_actors_id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('bigint', {
    name: 'actor_type_id',
    nullable: false,
  })
  actor_type_id!: number;

  @Column('boolean', {
    name: 'sex_age_disaggregation_not_apply',
    nullable: true,
  })
  sex_age_disaggregation_not_apply?: boolean;

  @Column('boolean', {
    name: 'women_youth',
    nullable: true,
  })
  women_youth?: boolean;

  @Column('boolean', {
    name: 'women_not_youth',
    nullable: true,
  })
  women_not_youth?: boolean;

  @Column('boolean', {
    name: 'men_youth',
    nullable: true,
  })
  men_youth?: boolean;

  @Column('boolean', {
    name: 'men_not_youth',
    nullable: true,
  })
  men_not_youth?: boolean;

  @Column('bigint', {
    name: 'actor_role_id',
    nullable: false,
  })
  actor_role_id!: number;

  @ManyToOne(() => Result, (result) => result.result_actors)
  @JoinColumn({
    name: 'result_id',
  })
  result?: Result;

  @ManyToOne(() => ClarisaActorType, (actorType) => actorType.result_actors)
  @JoinColumn({
    name: 'actor_type_id',
  })
  actor_type?: ClarisaActorType;

  @ManyToOne(() => ActorRole, (actorRole) => actorRole.result_actors)
  @JoinColumn({
    name: 'actor_role_id',
  })
  actor_role?: ActorRole;
}
