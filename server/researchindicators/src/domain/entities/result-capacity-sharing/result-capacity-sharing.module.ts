import { Module } from '@nestjs/common';
import { ResultCapacitySharingService } from './result-capacity-sharing.service';
import { ResultCapacitySharingController } from './result-capacity-sharing.controller';
import { ResultUsersModule } from '../result-users/result-users.module';
import { ResultLanguagesModule } from '../result-languages/result-languages.module';
import { ResultInstitutionsModule } from '../result-institutions/result-institutions.module';
import { ResultCountriesModule } from '../result-countries/result-countries.module';

@Module({
  controllers: [ResultCapacitySharingController],
  imports: [
    ResultUsersModule,
    ResultLanguagesModule,
    ResultInstitutionsModule,
    ResultCountriesModule,
  ],
  providers: [ResultCapacitySharingService],
  exports: [ResultCapacitySharingService],
})
export class ResultCapacitySharingModule {}
