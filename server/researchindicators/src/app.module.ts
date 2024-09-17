import { Module } from '@nestjs/common';
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
@Module({
  imports: [
    EntitiesModule,
    ClarisaModule,
    TypeOrmModule.forRoot(
      <DataSourceOptions>getDataSource(dataSourceTarget.CORE, false),
    ),
    TypeOrmModule.forRoot(
      <DataSourceOptions>getDataSource(dataSourceTarget.SECONDARY, false),
    ),
    RouterModule.register(mainRoute),
  ],
  controllers: [AppController],
  providers: [
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
export class AppModule {}
