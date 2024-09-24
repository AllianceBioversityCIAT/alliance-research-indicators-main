import { Controller } from '@nestjs/common';
import { ClarisaSubNationalsService } from './clarisa-sub-nationals.service';

@Controller('clarisa-sub-nationals')
export class ClarisaSubNationalsController {
  constructor(
    private readonly clarisaSubNationalsService: ClarisaSubNationalsService,
  ) {}
}
