import { Module } from '@nestjs/common';
import { ImpactOutcomesService } from './impact-outcomes.service';
import { ImpactOutcomesController } from './impact-outcomes.controller';
import { ImpactOutcomesRepository } from './repositories/impact-outcomes.repository';
import { PortfoliosModule } from '../portfolios/portfolios.module';

@Module({
  imports: [PortfoliosModule],
  controllers: [ImpactOutcomesController],
  providers: [ImpactOutcomesService, ImpactOutcomesRepository],
  exports: [ImpactOutcomesService, ImpactOutcomesRepository],
})
export class ImpactOutcomesModule {}
