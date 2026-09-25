import 'reflect-metadata';
import { ResultPrmsSyncController } from './result-prms-sync.controller';
import { ResultPrmsSyncModule } from './result-prms-sync.module';
import { ResultPrmsSyncService } from './result-prms-sync.service';
import { ResultPrmsSyncStatusReader } from './result-prms-sync-status.reader';
import { PrmsNormalizerModule } from '../../tools/prms-normalizer/prms-normalizer.module';
import { AppConfigModule } from '../app-config/app-config.module';
import { ResultUsersModule } from '../result-users/result-users.module';

describe('ResultPrmsSyncModule', () => {
  it('declares the controller and write/read providers', () => {
    const controllers: unknown[] = Reflect.getMetadata(
      'controllers',
      ResultPrmsSyncModule,
    );
    const providers: unknown[] = Reflect.getMetadata(
      'providers',
      ResultPrmsSyncModule,
    );

    expect(controllers).toContain(ResultPrmsSyncController);
    expect(providers).toContain(ResultPrmsSyncService);
    expect(providers).toContain(ResultPrmsSyncStatusReader);
  });

  it('imports the transport, config and ResultOwnerGuard graph', () => {
    const imports: unknown[] = Reflect.getMetadata(
      'imports',
      ResultPrmsSyncModule,
    );

    expect(imports).toContain(PrmsNormalizerModule);
    expect(imports).toContain(AppConfigModule);
    expect(imports).toContain(ResultUsersModule);
  });
});
