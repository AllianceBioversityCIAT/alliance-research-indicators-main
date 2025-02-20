import {
  Controller,
  Patch,
  Param,
  HttpStatus,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { UserAgressoContractsService } from './user-agresso-contracts.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { UserAgressoContract } from './entities/user-agresso-contract.entity';
import { ServiceResponseDto } from '../../shared/global-dto/service-response.dto';
import { User } from '../../complementary-entities/secondary/user/user.entity';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { ResultStatusGuard } from '../../shared/guards/result-status.guard';

@ApiTags('User Agresso Contracts')
@Controller()
@ApiBearerAuth()
export class UserAgressoContractsController {
  constructor(
    private readonly userAgressoContractsService: UserAgressoContractsService,
  ) {}

  @ApiParam({
    name: 'userId',
    required: true,
    description: 'User ID',
  })
  @ApiParam({
    name: 'agreementId',
    required: true,
    description: 'Agreement ID',
  })
  @ApiOperation({
    summary: 'Link user to contract',
    description:
      'Link user to contractThese endpoints are for development only, they will be removed in future updates.',
  })
  @UseGuards(ResultStatusGuard)
  @Patch('link/user/:userId/contract/:agreementId')
  async linkUserToContract(
    @Param('userId') userId: string,
    @Param('agreementId') agreementId: string,
  ): Promise<ServiceResponseDto<UserAgressoContract>> {
    return this.userAgressoContractsService
      .linkUserToContract(+userId, agreementId)
      .then((response) =>
        ResponseUtils.format({
          description: 'User linked to contract',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }

  @Post('link/user/automatic')
  @ApiOperation({
    summary: 'Automatic link user to contract',
    description:
      'Automatic link user to contractThese endpoints are for development only, they will be removed in future updates.',
  })
  @ApiBody({
    type: User,
    description:
      'User object the most important fields are sec_user_id, first_name, last_name',
  })
  async automaticLinkUserAgressoContract(
    @Body() user: User,
  ): Promise<ServiceResponseDto<UserAgressoContract[]>> {
    return this.handleAutomaticLinkUserAgressoContract(user);
  }

  @MessagePattern('automatic-link-user-to-contract')
  async socket_automaticLinkUserAgressoContract(
    @Payload() user: User,
  ): Promise<ServiceResponseDto<UserAgressoContract[]>> {
    return this.handleAutomaticLinkUserAgressoContract(user);
  }

  private async handleAutomaticLinkUserAgressoContract(
    user: User,
  ): Promise<ServiceResponseDto<UserAgressoContract[]>> {
    return this.userAgressoContractsService
      .automaticLinkUserAgressoContract(user)
      .then((response) =>
        ResponseUtils.format({
          description: 'User linked to contract',
          status: HttpStatus.OK,
          data: response,
        }),
      );
  }
}
