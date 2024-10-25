import { Module } from '@nestjs/common';
import { AgressoService } from './agresso.service';
import { AgressoController } from './agresso.controller';

@Module({
  controllers: [AgressoController],
  providers: [AgressoService],
  exports: [AgressoService],
})
export class AgressoModule {}
