import { Controller } from '@nestjs/common';
import { BaseController } from '../../shared/global-dto/base-controller';
import { ImpactAreaScoreService } from './impact-area-score.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Impact Area Score')
@Controller()
@ApiBearerAuth()
export class ImpactAreaScoreController extends BaseController<ImpactAreaScoreService> {
  constructor(service: ImpactAreaScoreService) {
    super(service, 'Impact Area Score');
  }
}
