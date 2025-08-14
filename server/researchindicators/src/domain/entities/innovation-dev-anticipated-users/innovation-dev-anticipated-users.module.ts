import { Module } from '@nestjs/common';
import { InnovationDevAnticipatedUsersService } from './innovation-dev-anticipated-users.service';
import { InnovationDevAnticipatedUsersController } from './innovation-dev-anticipated-users.controller';

@Module({
  controllers: [InnovationDevAnticipatedUsersController],
  providers: [InnovationDevAnticipatedUsersService],
  exports: [InnovationDevAnticipatedUsersService],
})
export class InnovationDevAnticipatedUsersModule {}
