import { Controller, Patch, Param } from '@nestjs/common';
import { UserAgressoContractsService } from './user-agresso-contracts.service';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

@ApiTags('User Agresso Contracts')
@Controller()
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
  @Patch('link/user/:userId/contract/:agreementId')
  linkUserToContract(
    @Param('userId') userId: string,
    @Param('agreementId') agreementId: string,
  ) {
    return this.userAgressoContractsService.linkUserToContract(
      +userId,
      agreementId,
    );
  }
}
