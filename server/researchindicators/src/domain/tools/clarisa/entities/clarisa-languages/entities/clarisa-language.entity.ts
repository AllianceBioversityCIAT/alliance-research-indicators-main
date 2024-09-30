import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../../../shared/global-dto/auditable.entity';
import { ResultLanguage } from '../../../../../entities/result-languages/entities/result-language.entity';

@Entity('clarisa_languages')
export class ClarisaLanguage extends AuditableEntity {
  @PrimaryColumn('bigint', {
    name: 'id',
    nullable: false,
  })
  id!: number;

  @Column('text', {
    name: 'name',
    nullable: true,
  })
  name!: string;

  @Column('text', {
    name: 'iso_alpha_2',
    nullable: true,
  })
  iso_alpha_2!: string;

  @Column('text', {
    name: 'iso_alpha_3',
    nullable: true,
  })
  iso_alpha_3!: string;

  @OneToMany(() => ResultLanguage, (resultLanguage) => resultLanguage.language)
  result_languages!: ResultLanguage[];
}
