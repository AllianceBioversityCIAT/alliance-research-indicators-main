import { Controller, Get, HttpStatus, Req } from '@nestjs/common';
import { AppService } from './app.service';
import { Request } from 'express';
import { ResponseUtils } from './domain/shared/utils/response.utils';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  mainPage(@Req() req: Request) {
    return ResponseUtils.format({
      description: 'Aliance',
      status: HttpStatus.OK,
      data: {
        message: 'Welcome to the Aliance API',
        author: 'One CGIAR - IBD',
        ip: req.ip,
        client: req.headers['user-agent'],
      },
    });
  }
}
