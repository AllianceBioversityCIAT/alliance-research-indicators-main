import { Module } from '@nestjs/common';
import { MaturityLevelService } from './maturity-level.service';
import { MaturityLevelController } from './maturity-level.controller';

@Module({
  controllers: [MaturityLevelController],
  providers: [MaturityLevelService],
  exports: [MaturityLevelService],
})
export class MaturityLevelModule {}
