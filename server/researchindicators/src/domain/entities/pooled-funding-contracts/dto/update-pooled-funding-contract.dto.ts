import { PartialType } from '@nestjs/swagger';
import { CreatePooledFundingContractDto } from './create-pooled-funding-contract.dto';

export class UpdatePooledFundingContractDto extends PartialType(
  CreatePooledFundingContractDto,
) {}
