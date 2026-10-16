// @akili-spec docs/specs/changes/my-pi-delegates — T-02
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PiDelegate } from './entities/pi-delegate.entity';
import { PiDelegateHistory } from './entities/pi-delegate-history.entity';
import { PiDelegatesRepository } from './repositories/pi-delegates.repository';
import { PiDelegatesService } from './pi-delegates.service';
import { PiDelegatesController } from './pi-delegates.controller';
import { PiDelegatesExportService } from './pi-delegates-export.service';
import { ExcelWorkbookBuilder } from '../reports/core/excel-workbook.builder';

@Module({
  imports: [TypeOrmModule.forFeature([PiDelegate, PiDelegateHistory])],
  controllers: [PiDelegatesController],
  // ExcelWorkbookBuilder is stateless: provided here directly instead of importing
  // ReportsModule (which pulls ResultsModule and its graph).
  providers: [
    PiDelegatesRepository,
    PiDelegatesService,
    PiDelegatesExportService,
    ExcelWorkbookBuilder,
  ],
  exports: [TypeOrmModule, PiDelegatesRepository, PiDelegatesService],
})
export class PiDelegatesModule {}
