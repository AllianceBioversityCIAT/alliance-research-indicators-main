import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { ClarisaSdg } from '../../../tools/clarisa/entities/clarisa-sdgs/entities/clarisa-sdg.entity';

@Entity('result_sdgs')
export class ResultSdg extends AuditableEntity {
  @PrimaryGeneratedColumn({
    type: 'bigint',
    name: 'result_sdg_id',
  })
  result_sdg_id!: number;

  @Column('bigint', {
    name: 'result_id',
    nullable: false,
  })
  result_id!: number;

  @Column('bigint', {
    name: 'clarisa_sdg_id',
    nullable: false,
  })
  clarisa_sdg_id!: number;

  @ManyToOne(() => Result, (result) => result.result_sdgs)
  @JoinColumn({
    name: 'result_id',
  })
  result!: Result;

  @ManyToOne(() => ClarisaSdg, (clarisaSdg) => clarisaSdg.result_sdgs)
  @JoinColumn({
    name: 'clarisa_sdg_id',
  })
  clarisa_sdg!: ClarisaSdg;
}
