import { Module } from '@nestjs/common';
import { ClarisaSubNationalsService } from './clarisa-sub-nationals.service';
import { ClarisaSubNationalsController } from './clarisa-sub-nationals.controller';

@Module({
  controllers: [ClarisaSubNationalsController],
  providers: [ClarisaSubNationalsService],
})
export class ClarisaSubNationalsModule {}
