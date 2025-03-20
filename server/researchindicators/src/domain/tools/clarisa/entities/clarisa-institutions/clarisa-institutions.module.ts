import { Module } from '@nestjs/common';
import { ClarisaInstitutionsService } from './clarisa-institutions.service';
import { ClarisaInstitutionsController } from './clarisa-institutions.controller';
import { ClarisaInstitutionsRepository } from './repositories/clarisa-institution.repository';

@Module({
  controllers: [ClarisaInstitutionsController],
  providers: [ClarisaInstitutionsService, ClarisaInstitutionsRepository],
  exports: [ClarisaInstitutionsService, ClarisaInstitutionsRepository],
})
export class ClarisaInstitutionsModule {}
