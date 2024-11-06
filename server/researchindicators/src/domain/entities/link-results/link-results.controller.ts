import { Controller } from '@nestjs/common';
import { LinkResultsService } from './link-results.service';

@Controller('link-results')
export class LinkResultsController {
  constructor(private readonly linkResultsService: LinkResultsService) {}
}
