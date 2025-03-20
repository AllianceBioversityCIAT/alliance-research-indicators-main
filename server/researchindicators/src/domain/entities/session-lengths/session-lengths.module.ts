import { Module } from '@nestjs/common';
import { SessionLengthsService } from './session-lengths.service';
import { SessionLengthsController } from './session-lengths.controller';

@Module({
  controllers: [SessionLengthsController],
  providers: [SessionLengthsService],
})
export class SessionLengthsModule {}
