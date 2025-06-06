import { Module } from '@nestjs/common';
import { DegreesService } from './degrees.service';
import { DegreesController } from './degrees.controller';

@Module({
  controllers: [DegreesController],
  providers: [DegreesService],
  exports: [DegreesService],
})
export class DegreesModule {}
