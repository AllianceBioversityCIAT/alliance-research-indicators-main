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
import { DegreesModule } from '../degrees/degrees.module';
import { SessionPurposesModule } from '../session-purposes/session-purposes.module';
import { ClarisaCountriesModule } from '../../tools/clarisa/entities/clarisa-countries/clarisa-countries.module';
import { GendersModule } from '../genders/genders.module';
import { AllianceUserStaffModule } from '../alliance-user-staff/alliance-user-staff.module';
import { ClarisaLanguagesModule } from '../../tools/clarisa/entities/clarisa-languages/clarisa-languages.module';

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
    DegreesModule,
    SessionPurposesModule,
    ClarisaCountriesModule,
    GendersModule,
    AllianceUserStaffModule,
    ClarisaLanguagesModule
  ],
  providers: [ResultCapacitySharingService, AiRoarMiningApp],
  exports: [ResultCapacitySharingService],
})
export class ResultCapacitySharingModule { }
