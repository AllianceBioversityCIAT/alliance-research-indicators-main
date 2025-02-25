import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { OpenSearchProperty } from '../../../tools/open-search/decorators/opensearch-property.decorator';
import { SubmissionHistory } from '../../green-checks/entities/submission-history.entity';

@Entity('result_status')
export class ResultStatus extends AuditableEntity {
  @PrimaryColumn({
    name: 'result_status_id',
    type: 'bigint',
  })
  @OpenSearchProperty({
    type: 'integer',
  })
  result_status_id!: number;

  @Column('text', {
    name: 'name',
    nullable: false,
  })
  @OpenSearchProperty({
    type: 'text',
  })
  name!: string;

  @Column('text', {
    name: 'description',
    nullable: true,
  })
  @OpenSearchProperty({
    type: 'text',
  })
  description!: string;

  @OneToMany(() => Result, (result) => result.result_status)
  results!: Result[];

  @OneToMany(
    () => SubmissionHistory,
    (submissionHistory) => submissionHistory.from_status,
  )
  submission_histories_from!: SubmissionHistory[];

  @OneToMany(
    () => SubmissionHistory,
    (submissionHistory) => submissionHistory.to_status,
  )
  submission_histories_to!: SubmissionHistory[];
}
