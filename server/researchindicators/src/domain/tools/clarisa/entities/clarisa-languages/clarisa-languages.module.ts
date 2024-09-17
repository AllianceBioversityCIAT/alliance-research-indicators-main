import { Module } from '@nestjs/common';
import { ClarisaLanguagesService } from './clarisa-languages.service';
import { ClarisaLanguagesController } from './clarisa-languages.controller';

@Module({
  controllers: [ClarisaLanguagesController],
  providers: [ClarisaLanguagesService],
})
export class ClarisaLanguagesModule {}
