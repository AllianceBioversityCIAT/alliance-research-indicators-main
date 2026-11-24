import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { PolicyChangePdfSectionHandler } from './policy-change-pdf-section.handler';
import { IndicatorsEnum } from '../../../../../indicators/enum/indicators.enum';
import { ResultPolicyChange } from '../../../../../result-policy-change/entities/result-policy-change.entity';
import { ResultInstitution } from '../../../../../result-institutions/entities/result-institution.entity';
import { LinkResult } from '../../../../../link-results/entities/link-result.entity';
import { InstitutionRolesEnum } from '../../../../../institution-roles/enums/institution-roles.enum';
import { LinkResultRolesEnum } from '../../../../../link-result-roles/enum/link-result-roles.enum';
import { AppConfig } from '../../../../../../shared/utils/app-config.util';

describe('PolicyChangePdfSectionHandler', () => {
  let handler: PolicyChangePdfSectionHandler;

  const policyChangeRepo = { findOne: jest.fn() };
  const institutionRepo = { find: jest.fn() };
  const linkResultRepo = { find: jest.fn() };
  const appConfig = { ARI_CLIENT_HOST: 'https://star.example.org' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PolicyChangePdfSectionHandler,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn((entity) => {
              if (entity === ResultPolicyChange) return policyChangeRepo;
              if (entity === ResultInstitution) return institutionRepo;
              if (entity === LinkResult) return linkResultRepo;
              throw new Error(`Unexpected repository ${entity?.name}`);
            }),
          },
        },
        { provide: AppConfig, useValue: appConfig },
      ],
    }).compile();

    handler = module.get(PolicyChangePdfSectionHandler);
  });

  it('handles the Policy Change indicator', () => {
    expect(handler.indicatorId).toBe(IndicatorsEnum.POLICY_CHANGE);
  });

  it('reads the policy change with its catalogs, organizations and links', async () => {
    policyChangeRepo.findOne.mockResolvedValue(null);
    institutionRepo.find.mockResolvedValue([]);
    linkResultRepo.find.mockResolvedValue([]);

    await handler.buildSections(30341);

    expect(policyChangeRepo.findOne).toHaveBeenCalledWith({
      where: { result_id: 30341, is_active: true },
      relations: { policy_type: true, policy_stage: true },
    });
    expect(institutionRepo.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          result_id: 30341,
          institution_role_id: InstitutionRolesEnum.POLICY_CHANGE,
          is_active: true,
        },
        relations: {
          institution: {
            institution_type: true,
            institution_locations: { country: true },
          },
        },
      }),
    );
    expect(linkResultRepo.find).toHaveBeenCalledWith({
      where: {
        result_id: 30341,
        link_result_role_id: LinkResultRolesEnum.POLICY_CHANGE,
        is_active: true,
      },
      relations: { other_result: { result_status: true } },
    });
  });

  it('splits the linked results by indicator into innovation_development and innovation_use', async () => {
    policyChangeRepo.findOne.mockResolvedValue({
      policy_type_id: 2,
      policy_type: { name: 'Legal instrument' },
      policy_stage_id: 1,
      policy_stage: { name: 'Stage 1' },
      evidence_stage: 'Evidence',
    });
    institutionRepo.find.mockResolvedValue([]);
    linkResultRepo.find.mockResolvedValue([
      {
        other_result: {
          result_id: 2,
          result_official_code: 9301,
          indicator_id: IndicatorsEnum.INNOVATION_USE,
          platform_code: 'TIP',
          title: 'Use',
          report_year_id: 2026,
          result_status: { result_status_id: 2, name: 'Submitted', config: {} },
        },
      },
      {
        other_result: {
          result_id: 1,
          result_official_code: 9150,
          indicator_id: IndicatorsEnum.INNOVATION_DEV,
          platform_code: 'STAR',
          title: 'Dev',
          report_year_id: 2025,
          result_status: null,
        },
      },
    ]);

    const { policy_change } = await handler.buildSections(30341);

    expect(policy_change.policy_type).toEqual({
      id: 2,
      name: 'Legal instrument',
    });
    expect(policy_change).not.toHaveProperty('usd_amount');
    expect(policy_change.innovation_development).toEqual(
      expect.objectContaining({
        result_id: 1,
        title: 'Dev',
        platform_code: 'STAR',
      }),
    );
    expect(policy_change.innovation_use).toEqual(
      expect.objectContaining({
        result_id: 2,
        title: 'Use',
        platform_code: 'TIP',
        report_year: 2026,
      }),
    );
  });

  it('links only the Innovation Development card to its PDF', async () => {
    policyChangeRepo.findOne.mockResolvedValue(null);
    institutionRepo.find.mockResolvedValue([]);
    linkResultRepo.find.mockResolvedValue([
      {
        other_result: {
          result_id: 1,
          result_official_code: 9150,
          indicator_id: IndicatorsEnum.INNOVATION_DEV,
          platform_code: 'STAR',
          title: 'Dev',
          report_year_id: 2025,
        },
      },
      {
        other_result: {
          result_id: 2,
          result_official_code: 9301,
          indicator_id: IndicatorsEnum.INNOVATION_USE,
          platform_code: 'STAR',
          title: 'Use',
          report_year_id: 2026,
        },
      },
    ]);

    const { policy_change } = await handler.buildSections(30341);

    expect(policy_change.innovation_development.pdf_url).toBe(
      'https://star.example.org/reports/result/STAR-9150?version=2025',
    );
    expect(policy_change.innovation_use).not.toHaveProperty('pdf_url');
  });

  it('sends a null pdf_url for an Innovation Development result outside STAR', async () => {
    policyChangeRepo.findOne.mockResolvedValue(null);
    institutionRepo.find.mockResolvedValue([]);
    linkResultRepo.find.mockResolvedValue([
      {
        other_result: {
          result_id: 1,
          result_official_code: 77,
          indicator_id: IndicatorsEnum.INNOVATION_DEV,
          platform_code: 'TIP',
          title: 'Dev in TIP',
          report_year_id: 2025,
        },
      },
    ]);

    const { policy_change } = await handler.buildSections(30341);

    expect(policy_change.innovation_development.pdf_url).toBeNull();
  });

  it('sends null links when nothing is linked', async () => {
    policyChangeRepo.findOne.mockResolvedValue(null);
    institutionRepo.find.mockResolvedValue([]);
    linkResultRepo.find.mockResolvedValue([]);

    const { policy_change } = await handler.buildSections(30341);

    expect(policy_change.innovation_development).toBeNull();
    expect(policy_change.innovation_use).toBeNull();
  });
});
