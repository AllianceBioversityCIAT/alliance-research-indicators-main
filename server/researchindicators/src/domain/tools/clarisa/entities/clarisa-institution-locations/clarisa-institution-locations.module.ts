import { Module } from '@nestjs/common';
import { ClarisaInstitutionLocationsService } from './clarisa-institution-locations.service';
import { ClarisaInstitutionLocationsController } from './clarisa-institution-locations.controller';

@Module({
  controllers: [ClarisaInstitutionLocationsController],
  providers: [ClarisaInstitutionLocationsService],
})
export class ClarisaInstitutionLocationsModule {}
