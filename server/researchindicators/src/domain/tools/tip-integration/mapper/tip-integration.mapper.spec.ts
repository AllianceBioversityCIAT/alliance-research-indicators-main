import { IntellectualPropertyOwnerEnum } from '../../../entities/intellectual-property-owners/enum/intellectual-property-owner.enum';
import { Result } from '../../../entities/results/entities/result.entity';
import { NotApplicable, NotProvided } from '../../../shared/const/utils.const';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { tipIntegrationMapper } from './tip-integration.mapper';

describe('tipIntegrationMapper', () => {
  const appConfig = {
    ARI_CLIENT_HOST: 'https://ari.example.org',
  } as AppConfig;

  it('should map minimal result with defaults', () => {
    const result = {
      result_id: 1,
      result_official_code: 99,
      title: 'T',
      description: 'D',
      report_year_id: 2024,
      created_at: new Date(2024, 0, 5),
    } as unknown as Result;

    const dto = tipIntegrationMapper(result, appConfig);

    expect(dto.resultId).toBe(1);
    expect(dto.resultCode).toBe(99);
    expect(dto.resultCreator.fullName).toBe(NotProvided);
    expect(dto.resultCreator.email).toBe(NotProvided);
    expect(dto.resultCreator.carnet).toBe(NotApplicable);
    expect(dto.createdAt).toBe('2024-01-05');
    expect(dto.linkToResult).toBe(
      'https://ari.example.org/result/99/general-information',
    );
  });

  it('should map user, contracts, indicator and status', () => {
    const result = {
      result_id: 2,
      result_official_code: 100,
      title: 'Title',
      description: 'Desc',
      report_year_id: 2025,
      created_at: new Date(2025, 5, 1),
      indicator: { name: 'Ind' },
      result_status: { name: 'Published' },
      result_users: [
        {
          user: {
            first_name: 'A',
            last_name: 'B',
            email: 'a@b.com',
            carnet: 'C1',
          },
        },
      ],
      result_contracts: [
        {
          agresso_contract: {
            project: 'P',
            agreement_id: 'AGR',
            description: 'Contract name',
          },
        },
      ],
    } as unknown as Result;

    const dto = tipIntegrationMapper(result, appConfig);

    expect(dto.indicator).toBe('Ind');
    expect(dto.resultStatusName).toBe('Published');
    expect(dto.resultCreator.fullName).toBe('A B');
    expect(dto.resultCreator.email).toBe('a@b.com');
    expect(dto.resultCreator.carnet).toBe('C1');
    expect(dto.reportingProject).toEqual({
      project: 'P',
      agreement_id: 'AGR',
      name: 'Contract name',
    });
  });

  it('should map IP rights including OTHERS owner and conditional descriptions', () => {
    const result = {
      result_id: 3,
      result_official_code: 101,
      title: 't',
      description: 'd',
      report_year_id: 2023,
      created_at: undefined,
      result_ip_rights: [
        {
          asset_ip_owner_id: IntellectualPropertyOwnerEnum.OTHERS,
          asset_ip_owner_description: 'Other org',
          intellectualPropertyOwner: { name: 'Owner label' },
          publicity_restriction: true,
          publicity_restriction_description: 'No press',
          potential_asset: true,
          potential_asset_description: 'High',
          requires_futher_development: true,
          requires_futher_development_description: 'Needs lab work',
        },
      ],
    } as unknown as Result;

    const dto = tipIntegrationMapper(result, appConfig);

    expect(dto.intellectualPropertyOwnerId).toBe(
      String(IntellectualPropertyOwnerEnum.OTHERS),
    );
    expect(dto.intellectualPropertyOwnerName).toBe('Owner label');
    expect(dto.iprOwnerOther).toBe('Other org');
    expect(dto.hasLegalRestrictions).toBe('true');
    expect(dto.legalRestrictionsDetails).toBe('No press');
    expect(dto.hasCommercializationPotential).toBe('true');
    expect(dto.commercializationDetails).toBe('High');
    expect(dto.requiresFurtherDevelopment).toBe('true');
    expect(dto.furtherDevelopmentDetails).toBe('Needs lab work');
    expect(dto.createdAt).toBe(NotProvided);
  });

  it('should omit legal and commercial details when flags are false', () => {
    const result = {
      result_id: 4,
      result_official_code: 102,
      title: 't',
      description: 'd',
      report_year_id: 2022,
      created_at: null,
      result_ip_rights: [
        {
          publicity_restriction: false,
          potential_asset: false,
          requires_futher_development: false,
        },
      ],
    } as unknown as Result;

    const dto = tipIntegrationMapper(result, appConfig);

    expect(dto.legalRestrictionsDetails).toBe(NotApplicable);
    expect(dto.commercializationDetails).toBe(NotApplicable);
    expect(dto.furtherDevelopmentDetails).toBe(NotApplicable);
  });
});
