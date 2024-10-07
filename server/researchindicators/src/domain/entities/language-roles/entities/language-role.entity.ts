import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { ResultLanguage } from '../../result-languages/entities/result-language.entity';

@Entity('language_roles')
export class LanguageRole extends AuditableEntity {
  @PrimaryGeneratedColumn({
    name: 'language_role_id',
    type: 'bigint',
  })
  language_role_id!: number;

  @Column('bigint', {
    name: 'name',
    nullable: false,
  })
  name!: string;

  @OneToMany(
    () => ResultLanguage,
    (resultLanguage) => resultLanguage.language_role,
  )
  result_languages!: ResultLanguage[];
}
