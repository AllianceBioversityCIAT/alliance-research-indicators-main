import { HttpModule } from '@nestjs/axios';
import { PdfViewerService } from './pdf-viewer.service';
import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../entities/app-config/app-config.module';

@Module({
  imports: [HttpModule, AppConfigModule],
  providers: [PdfViewerService],
  exports: [PdfViewerService],
})
export class PdfViewerModule {}
