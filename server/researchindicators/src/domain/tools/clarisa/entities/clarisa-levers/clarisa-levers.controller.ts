import { Controller } from '@nestjs/common';
import { ClarisaLeversService } from './clarisa-levers.service';

@Controller('clarisa-levers')
export class ClarisaLeversController {
  constructor(private readonly clarisaLeversService: ClarisaLeversService) {}
}
