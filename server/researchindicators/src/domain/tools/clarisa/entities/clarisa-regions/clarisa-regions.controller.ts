import { Controller } from '@nestjs/common';
import { ClarisaRegionsService } from './clarisa-regions.service';

@Controller('clarisa-regions')
export class ClarisaRegionsController {
  constructor(private readonly clarisaRegionsService: ClarisaRegionsService) {}
}
