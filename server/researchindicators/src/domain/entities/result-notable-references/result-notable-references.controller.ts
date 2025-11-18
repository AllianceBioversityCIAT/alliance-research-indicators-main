import { Controller } from '@nestjs/common';
import { ResultNotableReferencesService } from './result-notable-references.service';

@Controller('result-notable-references')
export class ResultNotableReferencesController {
  constructor(
    private readonly resultNotableReferencesService: ResultNotableReferencesService,
  ) {}
}
