import { forwardRef, Module } from '@nestjs/common';
import { ResultOicrService } from './result-oicr.service';
import { ResultOicrController } from './result-oicr.controller';
import { ResultTagsModule } from '../result-tags/result-tags.module';
import { ResultUsersModule } from '../result-users/result-users.module';
import { ResultInitiativesModule } from '../result-initiatives/result-initiatives.module';
import { ResultLeversModule } from '../result-levers/result-levers.module';
import { LinkResultsModule } from '../link-results/link-results.module';
import { ResultsModule } from '../results/results.module';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { TemplateModule } from '../../shared/auxiliar/template/template.module';
import { ResultOicrRepository } from './repositories/result-oicr.repository';
import { TempExternalOicrsModule } from '../temp_external_oicrs/temp_external_oicrs.module';
import { ResultContractsModule } from '../result-contracts/result-contracts.module';
import { ResultQuantificationsModule } from '../result-quantifications/result-quantifications.module';
import { ResultNotableReferencesModule } from '../result-notable-references/result-notable-references.module';
import { ResultImpactAreasModule } from '../result-impact-areas/result-impact-areas.module';
import { ResultImpactAreaGlobalTargetsModule } from '../result-impact-area-global-targets/result-impact-area-global-targets.module';

@Module({
  controllers: [ResultOicrController],
  providers: [ResultOicrService, MessageMicroservice, ResultOicrRepository],
  imports: [
    ResultTagsModule,
    ResultUsersModule,
    LinkResultsModule,
    ResultInitiativesModule,
    ResultLeversModule,
    forwardRef(() => ResultsModule),
    TemplateModule,
    TempExternalOicrsModule,
    ResultContractsModule,
    ResultQuantificationsModule,
    ResultNotableReferencesModule,
    ResultImpactAreasModule,
    ResultImpactAreaGlobalTargetsModule,
  ],
  exports: [ResultOicrService, ResultOicrRepository],
})
export class ResultOicrModule {}
