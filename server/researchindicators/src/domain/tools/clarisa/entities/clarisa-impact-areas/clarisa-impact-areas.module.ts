import { Module } from '@nestjs/common';
import { ClarisaImpactAreasService } from './clarisa-impact-areas.service';
import { ClarisaImpactAreasController } from './clarisa-impact-areas.controller';

@Module({
  controllers: [ClarisaImpactAreasController],
  providers: [ClarisaImpactAreasService],
  exports: [ClarisaImpactAreasService],
})
export class ClarisaImpactAreasModule {}
