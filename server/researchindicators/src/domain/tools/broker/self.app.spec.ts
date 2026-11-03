import { Test, TestingModule } from '@nestjs/testing';
import { SelfApp } from './self.app';
import { AppConfig } from '../../shared/utils/app-config.util';

describe('SelfApp', () => {
  let service: SelfApp;
  const originalEnv = process.env;

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      ARI_MQ_USER: 'user',
      ARI_MQ_PASSWORD: 'pass',
      ARI_MQ_HOST: 'localhost',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SelfApp,
        { provide: AppConfig, useValue: { ARI_QUEUE: 'test-queue' } },
      ],
    }).compile();

    service = module.get(SelfApp);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('emits an empty payload when no year is given', () => {
    const emit = jest
      .spyOn(
        service as unknown as {
          emitToPattern: (
            pattern: string,
            message: unknown,
          ) => Promise<unknown>;
        },
        'emitToPattern',
      )
      .mockResolvedValue(undefined);

    service.executeTipCloneKnowledgeProducts();

    expect(emit).toHaveBeenCalledWith('tip-clone-knowledge-products', {});
  });

  it('emits the reporting year when one is given', () => {
    const emit = jest
      .spyOn(
        service as unknown as {
          emitToPattern: (
            pattern: string,
            message: unknown,
          ) => Promise<unknown>;
        },
        'emitToPattern',
      )
      .mockResolvedValue(undefined);

    service.executeTipCloneKnowledgeProducts(2026);

    expect(emit).toHaveBeenCalledWith('tip-clone-knowledge-products', {
      year: 2026,
    });
  });

  it('returns the rejected promise from emitToPattern', async () => {
    const failure = new Error('publish failed');
    jest
      .spyOn(
        service as unknown as {
          emitToPattern: (
            pattern: string,
            message: unknown,
          ) => Promise<unknown>;
        },
        'emitToPattern',
      )
      .mockRejectedValue(failure);

    await expect(service.executeTipCloneKnowledgeProducts()).rejects.toBe(
      failure,
    );
  });
});
