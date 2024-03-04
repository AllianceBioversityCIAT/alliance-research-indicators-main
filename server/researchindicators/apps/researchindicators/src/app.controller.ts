import { Body, Controller, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Post()
  newEmail(@Body() body: any): string {
    return this.appService.newEmail(body);
  }
}
