import { Controller } from '@nestjs/common';
import { SessionFormatsService } from './session-formats.service';
@Controller('session-formats')
export class SessionFormatsController {
  constructor(private readonly sessionFormatsService: SessionFormatsService) {}
}
