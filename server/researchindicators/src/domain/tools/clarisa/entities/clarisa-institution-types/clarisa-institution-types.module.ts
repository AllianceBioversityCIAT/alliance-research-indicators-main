import { Module } from '@nestjs/common';
import { ClarisaInstitutionTypesService } from './clarisa-institution-types.service';
import { ClarisaInstitutionTypesController } from './clarisa-institution-types.controller';

@Module({
  controllers: [ClarisaInstitutionTypesController],
  providers: [ClarisaInstitutionTypesService],
})
export class ClarisaInstitutionTypesModule {}
