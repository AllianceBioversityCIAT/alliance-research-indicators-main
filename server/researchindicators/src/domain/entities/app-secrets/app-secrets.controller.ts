import { Body, Controller, HttpStatus, Post } from '@nestjs/common';
import { AppSecretsService } from './app-secrets.service';
import { CreateAppSecretDto } from './dto/create-app-secret.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBody } from '@nestjs/swagger';

@Controller()
export class AppSecretsController {
  constructor(private readonly appSecretsService: AppSecretsService) {}

  @ApiBody({
    type: CreateAppSecretDto,
    description: 'Create a new app secret',
  })
  @Post()
  async createAppSecret(@Body() data: CreateAppSecretDto) {
    return this.appSecretsService.createCredentials(data).then((result) =>
      ResponseUtils.format({
        description: 'App secret created successfully',
        status: HttpStatus.CREATED,
        data: result,
      }),
    );
  }
}
