import { Controller } from '@nestjs/common';
import { ResultInitiativesService } from './result-initiatives.service';

@Controller('result-initiatives')
export class ResultInitiativesController {
  constructor(
    private readonly resultInitiativesService: ResultInitiativesService,
  ) {}
}
