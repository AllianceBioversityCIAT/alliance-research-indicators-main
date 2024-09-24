import { Controller } from '@nestjs/common';
import { ClarisaLanguagesService } from './clarisa-languages.service';

@Controller('clarisa-languages')
export class ClarisaLanguagesController {
  constructor(
    private readonly clarisaLanguagesService: ClarisaLanguagesService,
  ) {}
}
