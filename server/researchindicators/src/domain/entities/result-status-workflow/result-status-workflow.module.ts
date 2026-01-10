import { Module } from '@nestjs/common';
import { ResultStatusWorkflowService } from './result-status-workflow.service';
import { ResultStatusWorkflowController } from './result-status-workflow.controller';
import { StatusWorkflowFunctionHandlerService } from './function-handler.service';
import { ResultStatusWorkflowRepository } from './repositories/result-status-workflow.repository';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { GreenChecksModule } from '../green-checks/green-checks.module';

@Module({
  controllers: [ResultStatusWorkflowController],
  providers: [
    ResultStatusWorkflowService,
    StatusWorkflowFunctionHandlerService,
    ResultStatusWorkflowRepository,
    MessageMicroservice,
  ],
  imports: [GreenChecksModule],
  exports: [ResultStatusWorkflowService, ResultStatusWorkflowRepository],
})
export class ResultStatusWorkflowModule {}
