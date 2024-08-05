import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getDataSource } from './orm.config';
import { dataSourceTarget } from './enum/data-source-target.enum';
import { DataSourceOptions } from 'typeorm';
@Module({
  imports: [
    TypeOrmModule.forRoot(
      getDataSource(dataSourceTarget.TEST, false) as DataSourceOptions,
    ),
  ],
  providers: [],
  exports: [TypeOrmModule],
})
export class OrmConfigTestModule {}
