import { Module, Global } from '@nestjs/common';
import { CurrentUserUtil } from './current-user.util';
import { AppConfig } from './app-config.util';
import { UpdateDataUtil } from './update-data.util';
import { ResultsUtil } from './results.util';
import { QueryService } from './query.service';
import { EnvAppConfigUtil } from './env-app-config.util';
import { PortfolioUtil } from './portfolio.util';
import { ReportingYearResolver } from './reporting-year.resolver';

@Global()
@Module({
  providers: [
    CurrentUserUtil,
    AppConfig,
    UpdateDataUtil,
    ResultsUtil,
    QueryService,
    EnvAppConfigUtil,
    PortfolioUtil,
    ReportingYearResolver,
  ],
  exports: [
    CurrentUserUtil,
    AppConfig,
    UpdateDataUtil,
    ResultsUtil,
    QueryService,
    EnvAppConfigUtil,
    PortfolioUtil,
    ReportingYearResolver,
  ],
})
export class GlobalUtilsModule {}
