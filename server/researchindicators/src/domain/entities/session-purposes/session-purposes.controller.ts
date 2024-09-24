import { Controller } from '@nestjs/common';
import { SessionPurposesService } from './session-purposes.service';
@Controller('session-purposes')
export class SessionPurposesController {
  constructor(
    private readonly sessionPurposesService: SessionPurposesService,
  ) {}
}
