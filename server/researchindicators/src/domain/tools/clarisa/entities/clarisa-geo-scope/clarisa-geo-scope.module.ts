import { Module } from '@nestjs/common';
import { ClarisaGeoScopeService } from './clarisa-geo-scope.service';
import { ClarisaGeoScopeController } from './clarisa-geo-scope.controller';

@Module({
  controllers: [ClarisaGeoScopeController],
  providers: [ClarisaGeoScopeService],
})
export class ClarisaGeoScopeModule {}
