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

  @Column('text', {
    name: 'actor_type_custom_name',
    nullable: true,
  })
  actor_type_custom_name?: string;

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

  /**
   * T-08 (R-IU-003, DD-6, DD-7, RB-5 layer 1) — Innovation Use actor counts.
   *
   * These five columns are additive and `int` (not `bigint` — DD-6: person
   * counts never approach 2.1B). They implement two MUTUALLY EXCLUSIVE
   * modes, selected by `sex_age_disaggregation_not_apply` on THIS row:
   *
   *   | `sex_age_disaggregation_not_apply` | Populated                | NULL           |
   *   | ----------------------------------- | ------------------------ | -------------- |
   *   | `FALSE` / `NULL` (disaggregated)     | the four `*_count` below  | `actors_count` |
   *   | `TRUE` (aggregate)                   | `actors_count`            | the four above |
   *
   * `actors_count` is NOT a stored total of the four disaggregated columns
   * (DD-7) — in aggregate mode the row has no parts to derive a total from,
   * so it is never a duplicate of a value derivable elsewhere in the same
   * row. No database constraint enforces this mutual exclusion (RB-5); it
   * is layered instead: (1) this comment, (2) T-09's
   * `innovation_use_validation` stored function mode-consistency check,
   * (3) chunk 2's API edge rejecting a payload that populates both modes.
   * The four legacy booleans above (`women_youth`, `women_not_youth`,
   * `men_youth`, `men_not_youth`) are untouched — Innovation Dev keeps
   * reading and writing them unchanged.
   */
  @Column('int', {
    name: 'women_youth_count',
    nullable: true,
  })
  women_youth_count?: number;

  @Column('int', {
    name: 'women_not_youth_count',
    nullable: true,
  })
  women_not_youth_count?: number;

  @Column('int', {
    name: 'men_youth_count',
    nullable: true,
  })
  men_youth_count?: number;

  @Column('int', {
    name: 'men_not_youth_count',
    nullable: true,
  })
  men_not_youth_count?: number;

  @Column('int', {
    name: 'actors_count',
    nullable: true,
  })
  actors_count?: number;

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
