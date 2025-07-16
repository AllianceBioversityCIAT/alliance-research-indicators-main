import { Module } from '@nestjs/common';
import { ResultInstitutionTypesService } from './result-institution-types.service';
import { ResultInstitutionTypesController } from './result-institution-types.controller';

@Module({
  controllers: [ResultInstitutionTypesController],
  providers: [ResultInstitutionTypesService],
  exports: [ResultInstitutionTypesService],
})
export class ResultInstitutionTypesModule {}
