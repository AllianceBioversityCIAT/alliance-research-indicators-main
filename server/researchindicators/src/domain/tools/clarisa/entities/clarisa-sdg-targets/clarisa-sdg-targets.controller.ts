import { Controller } from '@nestjs/common';
import { ClarisaSdgTargetsService } from './clarisa-sdg-targets.service';

@Controller('sdg-targets')
export class ClarisaSdgTargetsController {
  constructor(private readonly sdgTargetsService: ClarisaSdgTargetsService) {}
}
