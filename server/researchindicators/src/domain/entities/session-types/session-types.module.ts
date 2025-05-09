import { Module } from '@nestjs/common';
import { SessionTypesService } from './session-types.service';
import { SessionTypesController } from './session-types.controller';

@Module({
  controllers: [SessionTypesController],
  providers: [SessionTypesService],
  exports: [SessionTypesService],
})
export class SessionTypesModule {}
