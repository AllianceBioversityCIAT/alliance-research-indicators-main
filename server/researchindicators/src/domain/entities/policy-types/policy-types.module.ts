import { Module } from '@nestjs/common';
import { PolicyTypesService } from './policy-types.service';
import { PolicyTypesController } from './policy-types.controller';

@Module({
  controllers: [PolicyTypesController],
  providers: [PolicyTypesService],
  exports: [PolicyTypesService],
})
export class PolicyTypesModule {}
