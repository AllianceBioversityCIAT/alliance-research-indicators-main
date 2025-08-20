import { Controller } from '@nestjs/common';
import { ResultOicrService } from './result-oicr.service';

@Controller('result-oicr')
export class ResultOicrController {
  constructor(private readonly resultOicrService: ResultOicrService) {}
}
