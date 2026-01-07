import { Module } from '@nestjs/common';
import { ResultStatusWorkflowService } from './result-status-workflow.service';
import { ResultStatusWorkflowController } from './result-status-workflow.controller';
import { StatusWorkflowFunctionHandlerService } from './function-handler.service';

@Module({
  controllers: [ResultStatusWorkflowController],
  providers: [
    ResultStatusWorkflowService,
    StatusWorkflowFunctionHandlerService,
  ],
})
export class ResultStatusWorkflowModule {}
