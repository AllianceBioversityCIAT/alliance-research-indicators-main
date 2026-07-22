import { Module } from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosRepository } from './repositories/portfolios.repository';

@Module({
  controllers: [PortfoliosController],
  providers: [PortfoliosService, PortfoliosRepository],
  exports: [PortfoliosService, PortfoliosRepository],
})
export class PortfoliosModule {}
