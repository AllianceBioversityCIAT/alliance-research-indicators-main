import { Injectable, NotFoundException } from '@nestjs/common';
import type { ReportWorkbookHandler } from './core/excel-workbook.types';
import { StarResultsMetadataWorkbookHandler } from './handlers/star-results-metadata/star-results-metadata-workbook.handler';

@Injectable()
export class ReportHandlerRegistry {
  private readonly handlers = new Map<string, ReportWorkbookHandler>();

  constructor(starResultsMetadata: StarResultsMetadataWorkbookHandler) {
    this.register(starResultsMetadata);
  }

  register(handler: ReportWorkbookHandler): void {
    this.handlers.set(handler.workbookKey, handler);
  }

  getHandler(workbookKey: string): ReportWorkbookHandler {
    const handler = this.handlers.get(workbookKey);
    if (!handler) {
      throw new NotFoundException(
        `Unknown report workbook_key: ${workbookKey}`,
      );
    }
    return handler;
  }
}
