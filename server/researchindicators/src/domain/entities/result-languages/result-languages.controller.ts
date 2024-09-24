import { Controller } from '@nestjs/common';
import { ResultLanguagesService } from './result-languages.service';
@Controller('result-languages')
export class ResultLanguagesController {
  constructor(
    private readonly resultLanguagesService: ResultLanguagesService,
  ) {}
}
