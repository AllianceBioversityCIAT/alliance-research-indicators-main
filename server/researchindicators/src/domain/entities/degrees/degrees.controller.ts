import { Controller } from '@nestjs/common';
import { DegreesService } from './degrees.service';

@Controller('degrees')
export class DegreesController {
  constructor(private readonly degreesService: DegreesService) {}
}
