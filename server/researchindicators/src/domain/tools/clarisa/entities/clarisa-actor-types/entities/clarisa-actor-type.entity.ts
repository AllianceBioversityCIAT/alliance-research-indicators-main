import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultActor } from '../../../../../entities/result-actors/entities/result-actor.entity';

@Entity('clarisa_actor_types')
export class ClarisaActorType extends AuditableEntity {
  @PrimaryColumn({
    name: 'code',
    type: 'bigint',
  })
  code!: number;

  @Column({
    name: 'name',
    type: 'text',
    nullable: false,
  })
  name!: string;

  @OneToMany(() => ResultActor, (resultActor) => resultActor.actor_type)
  result_actors!: ResultActor[];
}
