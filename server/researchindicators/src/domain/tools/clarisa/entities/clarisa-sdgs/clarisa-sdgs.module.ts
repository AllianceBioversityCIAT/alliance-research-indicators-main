import { Module } from '@nestjs/common';
import { ClarisaSdgsService } from './clarisa-sdgs.service';
import { ClarisaSdgsController } from './clarisa-sdgs.controller';

@Module({
  controllers: [ClarisaSdgsController],
  providers: [ClarisaSdgsService],
  exports: [ClarisaSdgsService],
})
export class ClarisaSdgsModule {}
