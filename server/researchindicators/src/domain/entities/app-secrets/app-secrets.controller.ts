import {
  Body,
  Controller,
  HttpStatus,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AppSecretsService } from './app-secrets.service';
import { CreateAppSecretDto } from './dto/create-app-secret.dto';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { SetUpInterceptor } from '../../shared/Interceptors/setup.interceptor';
import { Roles } from '../../shared/decorators/roles.decorator';

@Controller()
@UseGuards(RolesGuard)
@ApiBearerAuth()
@UseInterceptors(SetUpInterceptor)
export class AppSecretsController {
  constructor(private readonly appSecretsService: AppSecretsService) {}

  @ApiBody({
    type: CreateAppSecretDto,
    description: 'Create a new app secret',
  })
  @Roles(SecRolesEnum.DEVELOPER)
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
