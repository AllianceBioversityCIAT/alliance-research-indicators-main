import { Controller } from '@nestjs/common';
import { ClarisaGeoScopeService } from './clarisa-geo-scope.service';
@Controller('clarisa-geo-scope')
export class ClarisaGeoScopeController {
  constructor(
    private readonly clarisaGeoScopeService: ClarisaGeoScopeService,
  ) {}
}
