import { Module } from '@nestjs/common';
import { ResultLanguagesService } from './result-languages.service';
import { ResultLanguagesController } from './result-languages.controller';

@Module({
  controllers: [ResultLanguagesController],
  providers: [ResultLanguagesService],
  exports: [ResultLanguagesService],
})
export class ResultLanguagesModule {}
