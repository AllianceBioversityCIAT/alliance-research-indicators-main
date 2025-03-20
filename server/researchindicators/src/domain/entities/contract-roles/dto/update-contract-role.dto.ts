import { PartialType } from '@nestjs/swagger';
import { CreateContractRoleDto } from './create-contract-role.dto';

export class UpdateContractRoleDto extends PartialType(CreateContractRoleDto) {}
