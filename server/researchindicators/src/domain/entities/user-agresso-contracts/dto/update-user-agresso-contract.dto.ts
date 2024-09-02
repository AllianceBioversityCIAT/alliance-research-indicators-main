import { PartialType } from '@nestjs/swagger';
import { CreateUserAgressoContractDto } from './create-user-agresso-contract.dto';

export class UpdateUserAgressoContractDto extends PartialType(
  CreateUserAgressoContractDto,
) {}
