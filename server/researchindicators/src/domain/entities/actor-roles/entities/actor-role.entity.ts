import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultActor } from '../../result-actors/entities/result-actor.entity';

@Entity('actor_roles')
export class ActorRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'actor_role_id',
    type: 'bigint',
  })
  actor_role_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(() => ResultActor, (resultActor) => resultActor.actor_role)
  result_actors!: ResultActor[];
}
