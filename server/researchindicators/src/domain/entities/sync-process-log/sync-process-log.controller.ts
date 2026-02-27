import { Controller } from '@nestjs/common';
import { SyncProcessLogService } from './sync-process-log.service';

@Controller('sync-process-log')
export class SyncProcessLogController {
  constructor(private readonly syncProcessLogService: SyncProcessLogService) {}
}
