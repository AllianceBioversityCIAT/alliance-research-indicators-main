import { PartialType } from '@nestjs/swagger';
import { CreatePolicyStageDto } from './create-policy-stage.dto';

export class UpdatePolicyStageDto extends PartialType(CreatePolicyStageDto) {}
