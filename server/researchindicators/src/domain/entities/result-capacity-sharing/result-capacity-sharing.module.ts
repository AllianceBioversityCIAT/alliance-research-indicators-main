import { Module } from '@nestjs/common';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';
import { ResultCapacitySharingController } from './result-capacity-sharing.controller';
import { ResultUsersModule } from '../result-users/result-users.module';
import { ResultLanguagesModule } from '../result-languages/result-languages.module';
import { ResultInstitutionsModule } from '../result-institutions/result-institutions.module';
import { ResultCountriesModule } from '../result-countries/result-countries.module';
import { AiRoarMiningApp } from '../../tools/broker/ai-roar-mining.app';
import { SessionLengthsModule } from '../session-lengths/session-lengths.module';
import { SessionTypesModule } from '../session-types/session-types.module';
import { DeliveryModalitiesModule } from '../delivery-modalities/delivery-modalities.module';
import { SessionFormatsModule } from '../session-formats/session-formats.module';

@Module({
  controllers: [ResultCapacitySharingController],
  imports: [
    ResultUsersModule,
    ResultLanguagesModule,
    ResultInstitutionsModule,
    ResultCountriesModule,
    SessionLengthsModule,
    SessionTypesModule,
    SessionFormatsModule,
    DeliveryModalitiesModule,
  ],
  providers: [ResultCapacitySharingService, AiRoarMiningApp],
  exports: [ResultCapacitySharingService],
})
export class ResultCapacitySharingModule {}
