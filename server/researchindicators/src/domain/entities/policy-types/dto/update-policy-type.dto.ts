import { PartialType } from '@nestjs/swagger';
import { CreatePolicyTypeDto } from './create-policy-type.dto';

export class UpdatePolicyTypeDto extends PartialType(CreatePolicyTypeDto) {}
