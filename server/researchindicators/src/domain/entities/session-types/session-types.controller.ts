import { Controller } from '@nestjs/common';
import { SessionTypesService } from './session-types.service';

@Controller('session-types')
export class SessionTypesController {
  constructor(private readonly sessionTypesService: SessionTypesService) {}
}
