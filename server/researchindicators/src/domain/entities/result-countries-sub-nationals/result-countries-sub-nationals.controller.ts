import { Controller } from '@nestjs/common';
import { ResultCountriesSubNationalsService } from './result-countries-sub-nationals.service';
@Controller('result-countries-sub-nationals')
export class ResultCountriesSubNationalsController {
  constructor(
    private readonly resultCountriesSubNationalsService: ResultCountriesSubNationalsService,
  ) {}
}
