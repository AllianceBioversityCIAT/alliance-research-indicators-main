import { PartialType } from '@nestjs/swagger';
import { CreateAgressoContractCountryDto } from './create-agresso-contract-country.dto';

export class UpdateAgressoContractCountryDto extends PartialType(
  CreateAgressoContractCountryDto,
) {}
