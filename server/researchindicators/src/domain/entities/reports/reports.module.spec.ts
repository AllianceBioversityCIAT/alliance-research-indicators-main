import { ClarisaProjectsModule } from '../../tools/clarisa/projects/clarisa-projects.module';
import { BilateralProjectMappingModule } from '../bilateral-project-mapping/bilateral-project-mapping.module';
import { BilateralMappingWorkbookHandler } from './handlers/bilateral-mapping-workbook.handler';
import { ReportsModule } from './reports.module';

describe('ReportsModule', () => {
  it('exports a Nest module class', () => {
    expect(ReportsModule).toBeDefined();
    expect(ReportsModule.name).toBe('ReportsModule');
  });

  it('imports BilateralProjectMappingModule and provides the workbook handler', () => {
    const imports = Reflect.getMetadata('imports', ReportsModule) as unknown[];
    const providers = Reflect.getMetadata(
      'providers',
      ReportsModule,
    ) as unknown[];

    expect(imports).toContain(BilateralProjectMappingModule);
    expect(imports).not.toContain(ClarisaProjectsModule);
    expect(providers).toContain(BilateralMappingWorkbookHandler);
  });
});
