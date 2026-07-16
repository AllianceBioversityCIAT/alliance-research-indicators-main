import { Module } from '@nestjs/common';
import { StrategicObjectivesService } from './strategic-objectives.service';
import { StrategicObjectivesController } from './strategic-objectives.controller';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { StrategicObjectivesRepository } from './repositories/strategic-objectives.repository';

@Module({
  imports: [PortfoliosModule],
  controllers: [StrategicObjectivesController],
  providers: [StrategicObjectivesService, StrategicObjectivesRepository],
  exports: [StrategicObjectivesService, StrategicObjectivesRepository],
})
export class StrategicObjectivesModule {}
