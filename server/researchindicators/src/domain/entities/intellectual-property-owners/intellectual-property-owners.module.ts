import { Module } from '@nestjs/common';
import { IntellectualPropertyOwnersService } from './intellectual-property-owners.service';
import { IntellectualPropertyOwnersController } from './intellectual-property-owners.controller';

@Module({
  controllers: [IntellectualPropertyOwnersController],
  providers: [IntellectualPropertyOwnersService],
})
export class IntellectualPropertyOwnersModule {}
