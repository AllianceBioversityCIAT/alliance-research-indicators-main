import { Controller} from '@nestjs/common';
import { IndicatorPerItemService } from './indicator_per_item.service';

@Controller('indicator-per-item')
export class IndicatorPerItemController {
  constructor(private readonly indicatorPerItemService: IndicatorPerItemService) {}

}
