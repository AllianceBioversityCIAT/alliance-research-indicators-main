import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppConfigKey } from '../app-config/enum/app-config-key.enum';
import { PORTFOLIO_2026_SDG_TARGET_CODES } from './portfolio-2026-sdg-target-codes';
import { Portfolio2026SdgTargetCatalogService } from './portfolio-2026-sdg-target-catalog.service';

describe('Portfolio2026SdgTargetCatalogService', () => {
  const configRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };
  const clarisaRepo = {
    find: jest.fn(),
  };
  const currentUser = {
    audit: jest.fn().mockReturnValue({ created_by: 1, updated_by: 1 }),
  };

  let service: Portfolio2026SdgTargetCatalogService;

  beforeEach(() => {
    jest.clearAllMocks();
    const dataSource = {
      getRepository: jest.fn((entity: { name?: string }) =>
        entity.name === 'AppConfig' ? configRepo : clarisaRepo,
      ),
    } as unknown as DataSource;
    service = new Portfolio2026SdgTargetCatalogService(dataSource, currentUser as never);
  });

  it('returns the built-in codes when no config row exists', async () => {
    configRepo.findOne.mockResolvedValue(null);
    await expect(service.getCodes()).resolves.toEqual([
      ...PORTFOLIO_2026_SDG_TARGET_CODES,
    ]);
  });

  it('returns stored codes, including an empty selection', async () => {
    configRepo.findOne.mockResolvedValue({ json_value: ['2.1', '3.3'] });
    await expect(service.getCodes()).resolves.toEqual(['2.1', '3.3']);

    configRepo.findOne.mockResolvedValue({ json_value: [] });
    await expect(service.getCodes()).resolves.toEqual([]);
  });

  it('replaces the list from Clarisa ids and creates the config row', async () => {
    configRepo.findOne.mockResolvedValue(null);
    clarisaRepo.find.mockResolvedValue([
      { id: 28, sdg_target_code: '2.1' },
      { id: 12, sdg_target_code: '1.1' },
    ]);

    await expect(service.replaceByTargetIds([28, 12, 28])).resolves.toEqual([
      '1.1',
      '2.1',
    ]);
    expect(configRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        key: AppConfigKey.PORTFOLIO_2026_SDG_TARGET_CODES,
        json_value: ['1.1', '2.1'],
      }),
    );
  });

  it('rejects unknown Clarisa ids', async () => {
    clarisaRepo.find.mockResolvedValue([{ id: 12, sdg_target_code: '1.1' }]);
    await expect(service.replaceByTargetIds([12, 99])).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
