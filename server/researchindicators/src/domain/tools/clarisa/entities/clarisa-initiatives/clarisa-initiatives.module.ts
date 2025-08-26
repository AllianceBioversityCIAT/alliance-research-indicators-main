import { Module } from '@nestjs/common';
import { ClarisaInitiativesService } from './clarisa-initiatives.service';
import { ClarisaInitiativesController } from './clarisa-initiatives.controller';

@Module({
  controllers: [ClarisaInitiativesController],
  providers: [ClarisaInitiativesService],
  exports: [ClarisaInitiativesService],
})
export class ClarisaInitiativesModule {}
