import { LinkResult } from '../../link-results/entities/link-result.entity';
import { ResultTag } from '../../result-tags/entities/result-tag.entity';
import { ResultUser } from '../../result-users/entities/result-user.entity';

export class StepOneOicrDto {
  main_contact_person: ResultUser;
  tagging: ResultTag[];
  linked_result: LinkResult[];
  outcome_impact_statement: string;
}
