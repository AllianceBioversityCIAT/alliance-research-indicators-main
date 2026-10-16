import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecUserEntity } from './entities/sec-user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SecUserEntity])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
