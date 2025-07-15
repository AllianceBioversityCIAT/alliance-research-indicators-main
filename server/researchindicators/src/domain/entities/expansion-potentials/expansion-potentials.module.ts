import { Module } from '@nestjs/common';
import { ExpansionPotentialsService } from './expansion-potentials.service';
import { ExpansionPotentialsController } from './expansion-potentials.controller';

@Module({
  controllers: [ExpansionPotentialsController],
  providers: [ExpansionPotentialsService],
})
export class ExpansionPotentialsModule {}
