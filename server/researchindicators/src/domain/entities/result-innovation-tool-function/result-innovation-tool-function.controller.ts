import { Controller } from '@nestjs/common';
import { ResultInnovationToolFunctionService } from './result-innovation-tool-function.service';

@Controller('result-innovation-tool-function')
export class ResultInnovationToolFunctionController {
  constructor(
    private readonly resultInnovationToolFunctionService: ResultInnovationToolFunctionService,
  ) {}
}
