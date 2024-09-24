import { Controller } from '@nestjs/common';
import { ResultLeversService } from './result-levers.service';
@Controller('result-levers')
export class ResultLeversController {
  constructor(private readonly resultLeversService: ResultLeversService) {}
}
