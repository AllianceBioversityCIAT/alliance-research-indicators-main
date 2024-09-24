import { Controller } from '@nestjs/common';
import { ResultCountriesService } from './result-countries.service';

@Controller('result-countries')
export class ResultCountriesController {
  constructor(
    private readonly resultCountriesService: ResultCountriesService,
  ) {}
}
