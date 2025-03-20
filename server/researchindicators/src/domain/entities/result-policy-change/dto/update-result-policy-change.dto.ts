import { PartialType } from '@nestjs/swagger';
import { CreateResultPolicyChangeDto } from './create-result-policy-change.dto';

export class UpdateResultPolicyChangeDto extends PartialType(
  CreateResultPolicyChangeDto,
) {}
