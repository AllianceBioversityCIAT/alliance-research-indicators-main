import { Module } from '@nestjs/common';
import { ResultUsersService } from './result-users.service';
import { ResultUsersController } from './result-users.controller';
import { UserService } from '../../complementary-entities/secondary/user/user.service';

@Module({
  controllers: [ResultUsersController],
  providers: [ResultUsersService, UserService],
  exports: [ResultUsersService, UserService],
})
export class ResultUsersModule {}
