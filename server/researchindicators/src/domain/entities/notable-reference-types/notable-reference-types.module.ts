import { Module } from '@nestjs/common';
import { NotableReferenceTypesService } from './notable-reference-types.service';
import { NotableReferenceTypesController } from './notable-reference-types.controller';

@Module({
  controllers: [NotableReferenceTypesController],
  providers: [NotableReferenceTypesService],
  exports: [NotableReferenceTypesService],
})
export class NotableReferenceTypesModule {}
