import { Module } from '@nestjs/common';
import { ClarisaLeversService } from './clarisa-levers.service';
import { ClarisaLeversController } from './clarisa-levers.controller';
import { PortfoliosModule } from '../../../../entities/portfolios/portfolios.module';

@Module({
  imports: [PortfoliosModule],
  controllers: [ClarisaLeversController],
  providers: [ClarisaLeversService],
  exports: [ClarisaLeversService],
})
export class ClarisaLeversModule {}
