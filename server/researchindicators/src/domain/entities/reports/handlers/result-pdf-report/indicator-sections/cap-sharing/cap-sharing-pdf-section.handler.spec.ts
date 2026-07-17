import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import {
  CapSharingPdfSectionHandler,
  mapAttendingOrganizationLabel,
} from './cap-sharing-pdf-section.handler';
import { ResultCapacitySharingService } from '../../../../../result-capacity-sharing/result-capacity-sharing.service';
import { ResultCapacitySharing } from '../../../../../result-capacity-sharing/entities/result-capacity-sharing.entity';
import { ResultInstitution } from '../../../../../result-institutions/entities/result-institution.entity';
import { IndicatorsEnum } from '../../../../../indicators/enum/indicators.enum';
import { SessionFormatEnum } from '../../../../../session-formats/enums/session-format.enum';
import { ClarisaCountry } from '../../../../../../tools/clarisa/entities/clarisa-countries/entities/clarisa-country.entity';

describe('CapSharingPdfSectionHandler', () => {
  let handler: CapSharingPdfSectionHandler;

  const resultCapacitySharingService = {
    findByResultId: jest.fn(),
  };
  const capSharingRepo = { findOne: jest.fn() };
  const institutionRepo = { find: jest.fn(), findOne: jest.fn() };
  const controlListRepo = { findOne: jest.fn() };
  const clarisaCountryRepo = { findOne: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CapSharingPdfSectionHandler,
        {
          provide: ResultCapacitySharingService,
          useValue: resultCapacitySharingService,
        },
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn((entity) => {
              if (entity === ResultCapacitySharing) return capSharingRepo;
              if (entity === ResultInstitution) return institutionRepo;
              if (entity === ClarisaCountry) return clarisaCountryRepo;
              return controlListRepo;
            }),
          },
        },
      ],
    }).compile();

    handler = module.get(CapSharingPdfSectionHandler);
  });

  it('registers the capacity sharing indicator id', () => {
    expect(handler.indicatorId).toBe(
      IndicatorsEnum.CAPACITY_SHARING_FOR_DEVELOPMENT,
    );
  });

  it('returns an empty object when no capacity sharing record exists', async () => {
    capSharingRepo.findOne.mockResolvedValue(null);

    await expect(handler.buildSections(10)).resolves.toEqual({});
    expect(resultCapacitySharingService.findByResultId).not.toHaveBeenCalled();
  });

  it('builds the cap_sharing section with labels for individual training', async () => {
    capSharingRepo.findOne.mockResolvedValue({ result_id: 17898 });
    resultCapacitySharingService.findByResultId.mockResolvedValue({
      delivery_modality_id: 3,
      end_date: '2026-05-22T05:00:00.000Z',
      session_format_id: SessionFormatEnum.INDIVIDUAL,
      session_type_id: 1,
      start_date: '2026-05-14T05:00:00.000Z',
      degree_id: 4,
      session_length_id: 2,
      individual: {
        gender_id: 3,
        trainee_name: 'test',
        affiliation: {
          result_institution_id: 13006,
          institution_id: 1,
        },
        nationality: {
          isoAlpha2: 'AL',
        },
      },
      training_supervisor: { user_id: '01906' },
      training_supervisor_languages: { language_id: 2 },
    });
    controlListRepo.findOne.mockImplementation(({ where }) => {
      const labels: Record<number, string> = {
        1: 'Individual training',
        2: 'Training',
        3: 'Hybrid',
        4: 'Other',
      };
      const id = Object.values(where ?? {})[0] as number;
      return Promise.resolve(labels[id] ? { name: labels[id] } : null);
    });
    institutionRepo.findOne.mockResolvedValue({
      institution: {
        name: 'International Center for Tropical Agriculture (CIAT)',
      },
    });
    clarisaCountryRepo.findOne.mockResolvedValue({ name: 'Albania' });

    const sections = await handler.buildSections(17898);

    expect(sections.cap_sharing).toMatchObject({
      delivery_modality_id: 3,
      session_format_id: SessionFormatEnum.INDIVIDUAL,
      individual: expect.objectContaining({ trainee_name: 'test' }),
      session_format_label: 'Individual training',
      affiliation_label: 'International Center for Tropical Agriculture (CIAT)',
      nationality_label: 'Albania',
    });
    expect(sections.cap_sharing?.group).toBeUndefined();
  });

  describe('mapAttendingOrganizationLabel', () => {
    it.each([
      [undefined, undefined],
      [null, undefined],
      [true, 'Yes'],
      [false, 'No'],
    ])('value %s returns %s', (value, expected) => {
      expect(mapAttendingOrganizationLabel(value)).toBe(expected);
    });
  });

  it.each([
    [true, 'Yes'],
    [false, 'No'],
  ])(
    'maps is_attending_organization %s to label %s',
    async (isAttendingOrganization, expectedLabel) => {
      capSharingRepo.findOne.mockResolvedValue({ result_id: 17898 });
      resultCapacitySharingService.findByResultId.mockResolvedValue({
        session_format_id: SessionFormatEnum.GROUP,
        group: {
          session_purpose_id: 1,
          is_attending_organization: isAttendingOrganization,
          trainee_organization_representative: [],
        },
      });
      controlListRepo.findOne.mockResolvedValue({ name: 'Workshop' });

      const sections = await handler.buildSections(17898);

      expect(sections.cap_sharing?.attending_organization_label).toBe(
        expectedLabel,
      );
    },
  );

  it('omits attending_organization_label when is_attending_organization is not set', async () => {
    capSharingRepo.findOne.mockResolvedValue({ result_id: 17898 });
    resultCapacitySharingService.findByResultId.mockResolvedValue({
      session_format_id: SessionFormatEnum.GROUP,
      group: {
        session_purpose_id: 1,
        trainee_organization_representative: [],
      },
    });
    controlListRepo.findOne.mockResolvedValue({ name: 'Workshop' });

    const sections = await handler.buildSections(17898);

    expect(sections.cap_sharing).not.toHaveProperty(
      'attending_organization_label',
    );
  });
});
