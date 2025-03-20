import { Module } from '@nestjs/common';
import { AppService } from './app.service';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { LoggingInterceptor } from './domain/shared/Interceptors/logging.interceptor';
import { ResponseInterceptor } from './domain/shared/Interceptors/response.interceptor';
import { GlobalExceptions } from './domain/shared/error-management/global.exception';
import { EntitiesModule } from './domain/entities/entities.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';
import { getDataSource } from './db/config/mysql/orm.config';
import { dataSourceTarget } from './db/config/mysql/enum/data-source-target.enum';
import { ClarisaModule } from './domain/tools/clarisa/clarisa.module';
import { AlianceManagementApp } from './domain/tools/broker/aliance-management.app';
import { AgressoToolsModule } from './domain/tools/agresso/agresso-tools.module';
import { GlobalUtilsModule } from './domain/shared/utils/global-utils.module';

@Module({
  imports: [
    EntitiesModule,
    ClarisaModule,
    AgressoToolsModule,
    TypeOrmModule.forRoot(
      <DataSourceOptions>getDataSource(dataSourceTarget.CORE, false),
    ),
    GlobalUtilsModule,
  ],
  providers: [
    AlianceManagementApp,
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
export class AppMicroserviceModule {}
