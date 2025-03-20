import { Controller } from '@nestjs/common';
import { AgressoContractCountriesService } from './agresso-contract-countries.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Agresso Contract Countries')
@Controller()
export class AgressoContractCountriesController {
  constructor(
    private readonly agressoContractCountriesService: AgressoContractCountriesService,
  ) {}
}
