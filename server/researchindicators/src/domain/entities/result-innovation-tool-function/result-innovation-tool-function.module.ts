import { Module } from '@nestjs/common';
import { ResultInnovationToolFunctionService } from './result-innovation-tool-function.service';
import { ResultInnovationToolFunctionController } from './result-innovation-tool-function.controller';

@Module({
  controllers: [ResultInnovationToolFunctionController],
  providers: [ResultInnovationToolFunctionService],
})
export class ResultInnovationToolFunctionModule {}
