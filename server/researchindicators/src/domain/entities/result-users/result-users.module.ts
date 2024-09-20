import { Module } from '@nestjs/common';
import { ResultUsersService } from './result-users.service';
import { ResultUsersController } from './result-users.controller';

@Module({
  controllers: [ResultUsersController],
  providers: [ResultUsersService],
})
export class ResultUsersModule {}
