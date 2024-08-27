import { PartialType } from '@nestjs/swagger';
import { CreateAgressoContractDto } from './create-agresso-contract.dto';

export class UpdateAgressoContractDto extends PartialType(
  CreateAgressoContractDto,
) {}
