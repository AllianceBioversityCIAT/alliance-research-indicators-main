import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ResultIpRightsService } from './result-ip-rights.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { UpdateDataUtil } from '../../shared/utils/update-data.util';
import { ResultsUtil } from '../../shared/utils/results.util';
import { IndicatorsEnum } from '../indicators/enum/indicators.enum';

describe('ResultIpRightsService', () => {
  let service: ResultIpRightsService;

  const mockFindOneBy = jest.fn();
  const mockSave = jest.fn();
  const mockUpdate = jest.fn();

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ updated_by: 1, created_by: 1 }),
  };

  const mockResultsUtil = {
    result: { indicator_id: IndicatorsEnum.KNOWLEDGE_PRODUCT },
  };

  const mockUpdateDataUtil = {
    updateLastUpdatedDate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultIpRightsService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              findOneBy: mockFindOneBy,
              save: mockSave,
              update: mockUpdate,
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
        { provide: ResultsUtil, useValue: mockResultsUtil },
        { provide: UpdateDataUtil, useValue: mockUpdateDataUtil },
      ],
    }).compile();

    service = module.get<ResultIpRightsService>(ResultIpRightsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 74
  describe('create', () => {
    it('should save a new ResultIpRight with the given resultId', async () => {
      const saved = { result_ip_rights_id: 10 };
      mockSave.mockResolvedValue(saved);

      const result = await service.create(10);

      expect(mockSave).toHaveBeenCalledWith(
        expect.objectContaining({ result_ip_rights_id: 10 }),
      );
      expect(result).toEqual(saved);
    });
  });

  // [CLAUDE/DONE] 75
  describe('update', () => {
    it('should update ip rights and call updateLastUpdatedDate', async () => {
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);

      const updateDto = {
        asset_ip_owner: null,
        asset_ip_owner_description: 'desc',
        publicity_restriction: true,
        publicity_restriction_description: null,
        requires_futher_development: false,
        requires_futher_development_description: null,
        potential_asset: null,
        potential_asset_description: null,
        private_sector_engagement_id: null,
        formal_ip_rights_application_id: null,
      };

      const result = await service.update(10, updateDto);

      expect(mockUpdate).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          asset_ip_owner_description: 'desc',
        }),
      );
      expect(mockUpdateDataUtil.updateLastUpdatedDate).toHaveBeenCalledWith(10);
      expect(result).toEqual(updateDto);
    });

    it('should include innovation_dev fields when indicator is INNOVATION_DEV', async () => {
      mockResultsUtil.result.indicator_id = IndicatorsEnum.INNOVATION_DEV;
      mockUpdate.mockResolvedValue({ affected: 1 });
      mockUpdateDataUtil.updateLastUpdatedDate.mockResolvedValue(undefined);

      const updateDto = {
        asset_ip_owner: null,
        asset_ip_owner_description: null,
        publicity_restriction: null,
        publicity_restriction_description: null,
        requires_futher_development: null,
        requires_futher_development_description: null,
        potential_asset: null,
        potential_asset_description: null,
        private_sector_engagement_id: 3,
        formal_ip_rights_application_id: 4,
      };

      await service.update(10, updateDto);

      expect(mockUpdate).toHaveBeenCalledWith(
        10,
        expect.objectContaining({
          private_sector_engagement_id: 3,
          formal_ip_rights_application_id: 4,
        }),
      );
    });
  });

  // [CLAUDE/DONE] 76
  describe('findByResultId', () => {
    it('should return UpdateIpRightDto from the found record', async () => {
      mockFindOneBy.mockResolvedValue({
        result_ip_rights_id: 10,
        asset_ip_owner_description: 'desc',
        publicity_restriction: true,
        requires_futher_development: false,
        asset_ip_owner_id: 5,
        potential_asset: null,
        potential_asset_description: null,
        publicity_restriction_description: null,
        requires_futher_development_description: null,
        private_sector_engagement_id: null,
        formal_ip_rights_application_id: null,
      });

      const result = await service.findByResultId(10);

      expect(mockFindOneBy).toHaveBeenCalledWith({
        result_ip_rights_id: 10,
        is_active: true,
      });
      expect(result.asset_ip_owner).toBe(5);
      expect(result.publicity_restriction).toBe(true);
    });

    it('should include innovation_dev fields when indicator is INNOVATION_DEV', async () => {
      mockResultsUtil.result.indicator_id = IndicatorsEnum.INNOVATION_DEV;
      mockFindOneBy.mockResolvedValue({
        asset_ip_owner_id: null,
        private_sector_engagement_id: 7,
        formal_ip_rights_application_id: 8,
      });

      const result = await service.findByResultId(10);

      expect(result.private_sector_engagement_id).toBe(7);
      expect(result.formal_ip_rights_application_id).toBe(8);
    });
  });
});
