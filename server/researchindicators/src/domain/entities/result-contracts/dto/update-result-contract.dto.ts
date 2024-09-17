import { PartialType } from '@nestjs/swagger';
import { CreateResultContractDto } from './create-result-contract.dto';

export class UpdateResultContractDto extends PartialType(CreateResultContractDto) {}
