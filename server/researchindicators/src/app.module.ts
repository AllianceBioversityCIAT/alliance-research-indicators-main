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
import { ScheduleModule } from '@nestjs/schedule';
import { CronModule } from './domain/tools/cron-jobs/cron.module';
import { JwtMiddleware } from './domain/shared/middlewares/jwr.middleware';
import { AlianceManagementApp } from './domain/tools/broker/aliance-management.app';
import { AgressoModule } from './domain/tools/agresso/agresso.module';
@Module({
  imports: [
    RouterModule.register(mainRoute),
    EntitiesModule,
    ClarisaModule,
    AgressoModule,
    CronModule,
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot(
      <DataSourceOptions>getDataSource(dataSourceTarget.CORE, false),
    ),
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
    consumer.apply(JwtMiddleware).forRoutes({
      path: '*',
      method: RequestMethod.ALL,
    });
  }
}
