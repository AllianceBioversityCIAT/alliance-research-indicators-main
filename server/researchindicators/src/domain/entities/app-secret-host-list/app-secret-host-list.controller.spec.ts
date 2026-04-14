import { Test, TestingModule } from '@nestjs/testing';
import { AppSecretHostListController } from './app-secret-host-list.controller';
import { AppSecretHostListService } from './app-secret-host-list.service';

describe('AppSecretHostListController', () => {
  let controller: AppSecretHostListController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppSecretHostListController],
      providers: [{ provide: AppSecretHostListService, useValue: {} }],
    }).compile();
    controller = module.get(AppSecretHostListController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
