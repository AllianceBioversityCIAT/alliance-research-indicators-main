import { Module } from '@nestjs/common';
import { ToolFunctionsService } from './tool-functions.service';
import { ToolFunctionsController } from './tool-functions.controller';

@Module({
  controllers: [ToolFunctionsController],
  providers: [ToolFunctionsService],
  exports: [ToolFunctionsService],
})
export class ToolFunctionsModule {}
