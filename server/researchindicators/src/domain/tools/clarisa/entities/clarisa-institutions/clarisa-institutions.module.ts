import { Module } from '@nestjs/common';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';
import { ClarisaInstitutionsController } from './clarisa-institutions.controller';

@Module({
  controllers: [ClarisaInstitutionsController],
  providers: [ClarisaInstitutionsService],
})
export class ClarisaInstitutionsModule {}
