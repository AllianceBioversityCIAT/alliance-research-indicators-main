import { Module } from '@nestjs/common';
import { ClarisaInstitutionTypesService } from './clarisa-institution-types.service';
import { ClarisaInstitutionTypesController } from './clarisa-institution-types.controller';
import { ClarisaInstitutionTypesRepository } from './repositories/clarisa-institution-types.repository';

@Module({
  controllers: [ClarisaInstitutionTypesController],
  providers: [
    ClarisaInstitutionTypesService,
    ClarisaInstitutionTypesRepository,
  ],
  exports: [ClarisaInstitutionTypesService, ClarisaInstitutionTypesRepository],
})
export class ClarisaInstitutionTypesModule {}
