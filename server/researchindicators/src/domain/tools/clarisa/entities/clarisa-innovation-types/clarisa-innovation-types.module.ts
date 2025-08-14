import { Module } from '@nestjs/common';
import { ClarisaInnovationTypesService } from './clarisa-innovation-types.service';
import { ClarisaInnovationTypesController } from './clarisa-innovation-types.controller';

@Module({
  controllers: [ClarisaInnovationTypesController],
  providers: [ClarisaInnovationTypesService],
  exports: [ClarisaInnovationTypesService],
})
export class ClarisaInnovationTypesModule {}
