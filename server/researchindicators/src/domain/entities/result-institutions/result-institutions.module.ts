import { Module } from '@nestjs/common';
import { ResultInstitutionsService } from './result-institutions.service';
import { ResultInstitutionsController } from './result-institutions.controller';

@Module({
  controllers: [ResultInstitutionsController],
  providers: [ResultInstitutionsService],
  exports: [ResultInstitutionsService],
})
export class ResultInstitutionsModule {}
