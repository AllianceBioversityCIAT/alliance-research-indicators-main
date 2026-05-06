import { ReportsModule } from './reports.module';

describe('ReportsModule', () => {
  it('exports a Nest module class', () => {
    expect(ReportsModule).toBeDefined();
    expect(ReportsModule.name).toBe('ReportsModule');
  });
});
