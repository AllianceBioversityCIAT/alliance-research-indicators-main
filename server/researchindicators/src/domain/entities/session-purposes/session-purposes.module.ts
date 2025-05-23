import { Module } from '@nestjs/common';
import { SessionPurposesService } from './session-purposes.service';
import { SessionPurposesController } from './session-purposes.controller';

@Module({
  controllers: [SessionPurposesController],
  providers: [SessionPurposesService],
  exports: [SessionPurposesService],
})
export class SessionPurposesModule {}
