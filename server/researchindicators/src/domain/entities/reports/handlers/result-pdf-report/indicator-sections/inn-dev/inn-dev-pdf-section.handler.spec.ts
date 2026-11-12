import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { InnDevPdfSectionHandler } from './inn-dev-pdf-section.handler';
import { ResultInnovationDevService } from '../../../../../result-innovation-dev/result-innovation-dev.service';
import { ResultInnovationDev } from '../../../../../result-innovation-dev/entities/result-innovation-dev.entity';
import { IndicatorsEnum } from '../../../../../indicators/enum/indicators.enum';
import { InnovationDevAnticipatedUser } from '../../../../../innovation-dev-anticipated-users/entities/innovation-dev-anticipated-user.entity';
import { DisseminationQualification } from '../../../../../dissemination-qualifications/entities/dissemination-qualification.entity';
import { ExpansionPotential } from '../../../../../expansion-potentials/entities/expansion-potential.entity';
import { ToolFunction } from '../../../../../tool-functions/entities/tool-function.entity';
import { LinkResult } from '../../../../../link-results/entities/link-result.entity';
import { ResultContract } from '../../../../../result-contracts/entities/result-contract.entity';
import { ClarisaInnovationCharacteristic } from '../../../../../../tools/clarisa/entities/clarisa-innovation-characteristics/entities/clarisa-innovation-characteristic.entity';
import { ClarisaInnovationType } from '../../../../../../tools/clarisa/entities/clarisa-innovation-types/entities/clarisa-innovation-type.entity';
import { ClarisaInnovationReadinessLevel } from '../../../../../../tools/clarisa/entities/clarisa-innovation-readiness-levels/entities/clarisa-innovation-readiness-level.entity';
import { ClarisaActorType } from '../../../../../../tools/clarisa/entities/clarisa-actor-types/entities/clarisa-actor-type.entity';
import { ClarisaInstitutionType } from '../../../../../../tools/clarisa/entities/clarisa-institution-types/entities/clarisa-institution-type.entity';
import { ClarisaInstitution } from '../../../../../../tools/clarisa/entities/clarisa-institutions/entities/clarisa-institution.entity';

const repo = () => ({ findOne: jest.fn(), find: jest.fn() });

describe('InnDevPdfSectionHandler', () => {
  let handler: InnDevPdfSectionHandler;

  const resultInnovationDevService = { findOne: jest.fn() };
  const repos = new Map<unknown, ReturnType<typeof repo>>(
    [
      ResultInnovationDev,
      ClarisaInnovationCharacteristic,
      ClarisaInnovationType,
      ClarisaInnovationReadinessLevel,
      InnovationDevAnticipatedUser,
      DisseminationQualification,
      ExpansionPotential,
      ClarisaActorType,
      ClarisaInstitutionType,
      ClarisaInstitution,
      ToolFunction,
      LinkResult,
      ResultContract,
    ].map((entity) => [entity, repo()]),
  );
  const repoOf = (entity: unknown) => repos.get(entity);

  const INNOVATION = {
    short_title: 'Drought-tolerant maize',
    innovation_nature_id: 1,
    innovation_type_id: 12,
    innovation_readiness_id: 7,
    anticipated_users_id: 2,
    is_new_or_improved_variety: true,
    actors: [{ actor_type_id: 1 }, { actor_type_id: 5 }],
    institution_types: [
      { is_organization_known: true, institution_id: 1 },
      { institution_type_id: 37, sub_institution_type_id: 38 },
    ],
    knowledge_sharing_form: {
      is_knowledge_sharing: true,
      dissemination_qualification_id: 2,
      tool_function_id: [{ tool_function_id: 3 }, { tool_function_id: 1 }],
      is_used_beyond_original_context: false,
      link_to_result: [{ other_result_id: 26053 }],
    },
    scaling_potential_form: { expansion_potential_id: 2 },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repos.forEach((r) => {
      r.findOne.mockResolvedValue(null);
      r.find.mockResolvedValue([]);
    });
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InnDevPdfSectionHandler,
        {
          provide: ResultInnovationDevService,
          useValue: resultInnovationDevService,
        },
        {
          provide: DataSource,
          useValue: { getRepository: jest.fn((entity) => repoOf(entity)) },
        },
      ],
    }).compile();

    handler = module.get(InnDevPdfSectionHandler);
  });

  it('registers the innovation development indicator id', () => {
    expect(handler.indicatorId).toBe(IndicatorsEnum.INNOVATION_DEV);
  });

  it('returns an empty object when the result has no innovation development record', async () => {
    await expect(handler.buildSections(10)).resolves.toEqual({});
    expect(resultInnovationDevService.findOne).not.toHaveBeenCalled();
  });

  it('builds innovation_details with every catalog label resolved', async () => {
    repoOf(ResultInnovationDev).findOne.mockResolvedValue({ result_id: 10 });
    resultInnovationDevService.findOne.mockResolvedValue(INNOVATION);
    repoOf(ClarisaInnovationCharacteristic).findOne.mockResolvedValue({
      id: 1,
      name: 'Technological',
      definition: 'A technology',
    });
    repoOf(ClarisaInnovationType).findOne.mockResolvedValue({
      code: 12,
      name: 'New or improved variety',
    });
    repoOf(ClarisaInnovationReadinessLevel).findOne.mockResolvedValue({
      id: 7,
      level: 7,
      name: 'Prototype',
    });
    repoOf(InnovationDevAnticipatedUser).findOne.mockResolvedValue({
      name: 'User have been determined',
    });
    repoOf(DisseminationQualification).findOne.mockResolvedValue({
      name: 'Proceed',
    });
    repoOf(ExpansionPotential).findOne.mockResolvedValue({
      name: 'Yes, with adaptations',
    });
    repoOf(ClarisaActorType).find.mockResolvedValue([
      { code: 1, name: 'Farmer' },
      { code: 5, name: 'Other' },
    ]);
    repoOf(ClarisaInstitutionType).find.mockImplementation(({ where }) =>
      Promise.resolve(
        [
          { code: 37, name: 'National extension service' },
          { code: 38, name: 'Regional extension unit' },
        ].filter((row) => where.code.value.includes(row.code)),
      ),
    );
    repoOf(ClarisaInstitution).find.mockResolvedValue([
      {
        code: 1,
        name: 'International Center for Tropical Agriculture',
        acronym: 'CIAT',
      },
    ]);
    repoOf(ToolFunction).find.mockResolvedValue([
      { id: 1, name: 'Research and analysis' },
      { id: 3, name: 'Capacity building' },
    ]);

    const { innovation_details } = await handler.buildSections(10);

    expect(innovation_details).toEqual(
      expect.objectContaining({
        short_title: 'Drought-tolerant maize',
        innovation_nature: expect.objectContaining({ name: 'Technological' }),
        innovation_type: expect.objectContaining({ code: 12 }),
        innovation_readiness: expect.objectContaining({ level: 7 }),
        anticipated_users_label: 'User have been determined',
        is_new_or_improved_variety_label: 'Yes',
        actor_type_labels: { 1: 'Farmer', 5: 'Other' },
        institution_type_labels: { 37: 'National extension service' },
        sub_institution_type_labels: { 38: 'Regional extension unit' },
        institution_labels: {
          1: 'International Center for Tropical Agriculture (CIAT)',
        },
        is_knowledge_sharing_label: 'Yes',
        dissemination_qualification_label: 'Proceed',
        // In the order the user picked them, not the catalog's.
        tool_function_labels: ['Capacity building', 'Research and analysis'],
        is_used_beyond_original_context_label: 'No',
        expansion_potential_label: 'Yes, with adaptations',
      }),
    );
  });

  it('enriches linked results with title, type, status and primary project', async () => {
    repoOf(ResultInnovationDev).findOne.mockResolvedValue({ result_id: 10 });
    resultInnovationDevService.findOne.mockResolvedValue(INNOVATION);
    repoOf(LinkResult).find.mockResolvedValue([
      {
        link_result_id: 146,
        other_result_id: 26053,
        link_result_role_id: 2,
        other_result: {
          title: 'A holistic framework',
          result_official_code: 9001,
          indicator: { name: 'Innovation Development' },
          result_status: { name: 'Approved' },
        },
      },
    ]);
    repoOf(ResultContract).find.mockResolvedValue([
      {
        result_id: 26053,
        contract_id: 'A1048',
        agresso_contract: {
          agreement_id: 'A1048',
          description: 'CIFOR Hosted - HQ',
        },
      },
    ]);

    const { innovation_details } = await handler.buildSections(10);

    expect(innovation_details.knowledge_sharing_form.link_to_result).toEqual([
      {
        link_result_id: 146,
        other_result_id: 26053,
        link_result_role_id: 2,
        result_code: 9001,
        linked_result_title: 'A holistic framework',
        result_type_label: 'Innovation Development',
        qa_status_label: 'Approved',
        reporting_project_name: 'CIFOR Hosted - HQ (A1048)',
      },
    ]);
  });

  it('skips catalog queries for answers that were never given', async () => {
    repoOf(ResultInnovationDev).findOne.mockResolvedValue({ result_id: 10 });
    resultInnovationDevService.findOne.mockResolvedValue({
      short_title: 'Empty',
      actors: [],
      institution_types: [],
      knowledge_sharing_form: { tool_function_id: [], link_to_result: [] },
      scaling_potential_form: {},
    });

    const { innovation_details } = await handler.buildSections(10);

    expect(repoOf(ClarisaInnovationType).findOne).not.toHaveBeenCalled();
    expect(repoOf(ClarisaActorType).find).not.toHaveBeenCalled();
    expect(repoOf(ResultContract).find).not.toHaveBeenCalled();
    expect(innovation_details.short_title).toBe('Empty');
    expect(innovation_details.anticipated_users_label).toBeUndefined();
  });
});
