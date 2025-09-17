import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_FILTER, APP_INTERCEPTOR, RouterModule } from '@nestjs/core';
import { LoggingInterceptor } from './domain/shared/Interceptors/logging.interceptor';
import { ResponseInterceptor } from './domain/shared/Interceptors/response.interceptor';
import { GlobalExceptions } from './domain/shared/error-management/global.exception';
import { EntitiesModule } from './domain/entities/entities.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { getDataSource } from './db/config/mysql/orm.config';
import { dataSourceTarget } from './db/config/mysql/enum/data-source-target.enum';
import { route as mainRoute } from './domain/routes/main.routes';
import { ClarisaModule } from './domain/tools/clarisa/clarisa.module';
import { JwtMiddleware } from './domain/shared/middlewares/jwr.middleware';
import { AlianceManagementApp } from './domain/tools/broker/aliance-management.app';
import { AgressoToolsModule } from './domain/tools/agresso/agresso-tools.module';
import { GlobalUtilsModule } from './domain/shared/utils/global-utils.module';
import { RoarManagementModule } from './domain/tools/roar-management/roar-management.module';
import { ResultOpenSearchModule } from './domain/tools/open-search/results/result.opensearch.module';
import { TipIntegrationModule } from './domain/tools/tip-integration/tip-integration.module';
import { DynamoFeedbackModule } from './domain/tools/dynamo-feedback/dynamo-feedback.module';
import { AllianceStaffOpenSearchModule } from './domain/tools/open-search/alliance-staff/alliance-staff.opensearch.module';

@Module({
  imports: [
    RouterModule.register(mainRoute),
    GlobalUtilsModule,
    EntitiesModule,
    ClarisaModule,
    AgressoToolsModule,
    TypeOrmModule.forRoot(
      <DataSourceOptions>getDataSource(dataSourceTarget.CORE, false),
    ),
    RoarManagementModule,
    ResultOpenSearchModule,
    AllianceStaffOpenSearchModule,
    TipIntegrationModule,
    DynamoFeedbackModule,
  ],
  controllers: [AppController],
  providers: [
    AlianceManagementApp,
    JwtMiddleware,
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: GlobalExceptions,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(JwtMiddleware)
      .exclude({
        path: '/api/configuration/:key',
        method: RequestMethod.GET,
      })
      .forRoutes({
        path: '*',
        method: RequestMethod.ALL,
      });
  }
}
