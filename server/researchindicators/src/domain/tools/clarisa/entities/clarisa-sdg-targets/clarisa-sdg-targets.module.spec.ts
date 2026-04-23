import { Test, TestingModule } from '@nestjs/testing';
import { ClarisaSdgTargetsModule } from './clarisa-sdg-targets.module';
import { ClarisaSdgTargetsController } from './clarisa-sdg-targets.controller';
import { ClarisaSdgTargetsService } from './clarisa-sdg-targets.service';

describe('ClarisaSdgTargetsModule', () => {
  it('compiles and exposes controller with service overridden', async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ClarisaSdgTargetsModule],
    })
      .overrideProvider(ClarisaSdgTargetsService)
      .useValue({ findAll: jest.fn() })
      .compile();

    expect(moduleRef.get(ClarisaSdgTargetsController)).toBeInstanceOf(
      ClarisaSdgTargetsController,
    );
  });
});
