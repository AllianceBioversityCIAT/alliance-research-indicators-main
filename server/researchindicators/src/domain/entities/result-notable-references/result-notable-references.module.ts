import { Module } from '@nestjs/common';
import { ResultNotableReferencesService } from './result-notable-references.service';
import { ResultNotableReferencesController } from './result-notable-references.controller';

@Module({
  controllers: [ResultNotableReferencesController],
  providers: [ResultNotableReferencesService],
  exports: [ResultNotableReferencesService],
})
export class ResultNotableReferencesModule {}
