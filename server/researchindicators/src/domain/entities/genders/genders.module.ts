import { Module } from '@nestjs/common';
import { GendersService } from './genders.service';
import { GendersController } from './genders.controller';

@Module({
  controllers: [GendersController],
  providers: [GendersService],
  exports: [GendersService],
})
export class GendersModule {}
