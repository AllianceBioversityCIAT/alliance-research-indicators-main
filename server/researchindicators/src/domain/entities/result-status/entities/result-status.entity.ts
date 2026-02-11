import { Column, DeepPartial, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { AuditableEntity } from '../../../shared/global-dto/auditable.entity';
import { Result } from '../../results/entities/result.entity';
import { OpenSearchProperty } from '../../../tools/open-search/decorators/opensearch-property.decorator';
import { SubmissionHistory } from '../../green-checks/entities/submission-history.entity';
import { ResultStatusWorkflow } from '../../result-status-workflow/entities/result-status-workflow.entity';

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

  @Column('json', {
    name: 'editable_roles',
    nullable: true,
  })
  editable_roles!: number[];

  @Column('json', {
    name: 'config',
    nullable: true,
  })
  config!: DeepPartial<ResultStatusConfig>;

  @Column('text', {
    name: 'action_description',
    nullable: true,
  })
  action_description!: string;

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

  @OneToMany(
    () => ResultStatusWorkflow,
    (resultStatusWorkflow) => resultStatusWorkflow.from_status,
  )
  result_status_workflows_from!: ResultStatusWorkflow[];

  @OneToMany(
    () => ResultStatusWorkflow,
    (resultStatusWorkflow) => resultStatusWorkflow.to_status,
  )
  result_status_workflows_to!: ResultStatusWorkflow[];
}
export class ResultStatusConfig {
  color: {
    border: string;
    text: string;
    background: string;
  };
  icon: {
    color: string;
    name: string;
  };
  image: string;

  constructor(data: DeepPartial<ResultStatusConfig>) {
    Object.assign(this, data);
  }

  get config(): string {
    return JSON.stringify(this);
  }
}
