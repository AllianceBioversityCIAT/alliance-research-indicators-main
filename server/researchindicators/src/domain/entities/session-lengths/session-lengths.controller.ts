import { Controller } from '@nestjs/common';
import { SessionLengthsService } from './session-lengths.service';
@Controller('session-lengths')
export class SessionLengthsController {
  constructor(private readonly sessionLengthsService: SessionLengthsService) {}
}
