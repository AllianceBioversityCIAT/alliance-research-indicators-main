import { forwardRef, Module } from '@nestjs/common';
import { GreenChecksService } from './green-checks.service';
import { GreenChecksController } from './green-checks.controller';
import { GreenCheckRepository } from './repository/green-checks.repository';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { TemplateModule } from '../../shared/auxiliar/template/template.module';
import { ResultOicrModule } from '../result-oicr/result-oicr.module';

@Module({
  controllers: [GreenChecksController],
  providers: [GreenChecksService, GreenCheckRepository, MessageMicroservice],
  imports: [TemplateModule, forwardRef(() => ResultOicrModule)],
  exports: [GreenChecksService, GreenCheckRepository],
})
export class GreenChecksModule {}
