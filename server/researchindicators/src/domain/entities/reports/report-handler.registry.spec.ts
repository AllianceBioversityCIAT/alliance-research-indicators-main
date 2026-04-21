import { NotFoundException } from '@nestjs/common';
import type { ReportWorkbookHandler } from './core/excel-workbook.types';
import { ReportHandlerRegistry } from './report-handler.registry';

function mockHandler(key: string): ReportWorkbookHandler {
  return {
    workbookKey: key,
    sheetOrderEnvVarName: null,
    buildWorkbookSpec: jest.fn(async () => ({ sheets: [] })),
  };
}

describe('ReportHandlerRegistry', () => {
  it('registers the injected handler and returns it by key', () => {
    const star = mockHandler('star_results_metadata');
    const registry = new ReportHandlerRegistry(star as any);
    expect(registry.getHandler('star_results_metadata')).toBe(star);
  });

  it('throws NotFoundException for unknown workbook_key', () => {
    const registry = new ReportHandlerRegistry(
      mockHandler('star_results_metadata') as any,
    );
    expect(() => registry.getHandler('missing')).toThrow(NotFoundException);
    expect(() => registry.getHandler('missing')).toThrow(
      'Unknown report workbook_key: missing',
    );
  });

  it('register adds additional handlers', () => {
    const star = mockHandler('star_results_metadata');
    const registry = new ReportHandlerRegistry(star as any);
    const other = mockHandler('other_report');
    registry.register(other);
    expect(registry.getHandler('other_report')).toBe(other);
  });
});
