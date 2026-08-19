import { Test, TestingModule } from '@nestjs/testing';
import { DataSource, IsNull } from 'typeorm';
import { ResultInstitutionTypesService } from './result-institution-types.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { InstitutionTypeRoleEnum } from '../institution-type-roles/enum/institution-type-role.enum';
import { ClarisaInstitutionTypeEnum } from '../../tools/clarisa/entities/clarisa-institution-types/enum/clarisa-institution-type.enum';
import { InnovationUseOrganizationDto } from '../result-innovation-use/dto/create-result-innovation-use.dto';

describe('ResultInstitutionTypesService', () => {
  let service: ResultInstitutionTypesService;

  const mockUpdate = jest.fn();
  const mockFindOne = jest.fn();
  const mockSave = jest.fn();

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ updated_by: 1, created_by: 1 }),
  };

  const mockRepo = {
    find: jest.fn(),
    findOne: mockFindOne,
    save: mockSave,
    update: mockUpdate,
    metadata: {
      primaryColumns: [{ propertyName: 'result_institution_type_id' }],
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultInstitutionTypesService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue(mockRepo),
          },
        },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ResultInstitutionTypesService>(
      ResultInstitutionTypesService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 70
  describe('saveInnovationDev', () => {
    it('should call create for OTHER type institutions', async () => {
      const createSpy = jest
        .spyOn(service as any, 'create')
        .mockResolvedValue([{ result_institution_type_id: 1 }]);
      const mockManager = { getRepository: jest.fn() } as any;

      await service.saveInnovationDev(
        10,
        [
          {
            institution_type_id: ClarisaInstitutionTypeEnum.OTHER,
            institution_type_custom_name: 'Custom',
          } as any,
        ],
        mockManager,
      );

      expect(createSpy).toHaveBeenCalledWith(
        10,
        expect.any(Array),
        'institution_type_custom_name',
        InstitutionTypeRoleEnum.INNOVATION_DEV,
        mockManager,
        ['institution_type_id'],
      );
    });

    it('should call create for regular type institutions (non-OTHER, no sub_type)', async () => {
      const createSpy = jest
        .spyOn(service as any, 'create')
        .mockResolvedValue([{ result_institution_type_id: 2 }]);
      const mockManager = { getRepository: jest.fn() } as any;

      await service.saveInnovationDev(
        10,
        [
          {
            institution_type_id: 5,
            sub_institution_type_id: null,
          } as any,
        ],
        mockManager,
      );

      expect(createSpy).toHaveBeenCalledWith(
        10,
        expect.any(Array),
        'institution_type_id',
        InstitutionTypeRoleEnum.INNOVATION_DEV,
        mockManager,
        undefined,
        undefined,
        [],
      );
    });

    it('should not call create when data is empty', async () => {
      const createSpy = jest
        .spyOn(service as any, 'create')
        .mockResolvedValue([]);
      const mockManager = { getRepository: jest.fn() } as any;

      await service.saveInnovationDev(10, [], mockManager);

      expect(createSpy).not.toHaveBeenCalled();
    });
  });

  // [CLAUDE/DONE] 71
  describe('customSaveInnovationDev', () => {
    it('should deactivate existing records and save new ones', async () => {
      const mockTempRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        save: jest.fn().mockResolvedValue([{ result_institution_type_id: 1 }]),
      };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockTempRepo),
      } as any;

      const data = [
        {
          institution_type_id: 5,
          sub_institution_type_id: null,
          is_organization_known: false,
        } as any,
      ];

      const result = await service.customSaveInnovationDev(
        10,
        data,
        mockManager,
      );

      expect(mockTempRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ result_id: 10, is_active: true }),
        { is_active: false },
      );
      expect(mockTempRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should deduplicate data before saving', async () => {
      const mockTempRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockResolvedValue({ affected: 1 }),
        save: jest.fn().mockResolvedValue([]),
      };
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(mockTempRepo),
      } as any;

      const data = [
        {
          institution_type_id: 5,
          sub_institution_type_id: null,
          is_organization_known: false,
        } as any,
        {
          institution_type_id: 5,
          sub_institution_type_id: null,
          is_organization_known: false,
        } as any,
      ];

      await service.customSaveInnovationDev(10, data, mockManager);

      const savedData = mockTempRepo.save.mock.calls[0][0];
      expect(savedData).toHaveLength(1);
    });
  });

  // T-04 (R-IUA-007 AC.1, AC.3, AC.4, AC.5; R-IUA-009 AC.2, AC.4). Shared
  // faithful repository double (KZ-001): a real Repository<ResultInstitutionType>
  // carries delete/remove/softDelete, so a hard-delete mutation planted
  // inside the save loop fails on an assertion below, not on a TypeError
  // from a minimal mock that lacks the method entirely.
  const buildTempRepo = (
    overrides: {
      findOne?: jest.Mock;
      update?: jest.Mock;
      save?: jest.Mock;
    } = {},
  ) => ({
    findOne: overrides.findOne ?? jest.fn().mockResolvedValue(null),
    update: overrides.update ?? jest.fn().mockResolvedValue({ affected: 1 }),
    save:
      overrides.save ??
      jest.fn().mockImplementation((rows: unknown[]) => Promise.resolve(rows)),
    delete: jest.fn(),
    remove: jest.fn(),
    softDelete: jest.fn(),
  });

  describe('customSaveInnovationUse', () => {
    it('deactivates by the role-scoped predicate naming institution_type_role_id: INNOVATION_USE (R-IUA-009 AC.2, AC.4 falsifying input: removing this key)', async () => {
      const tempRepo = buildTempRepo();
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      await service.customSaveInnovationUse(10, [], mockManager);

      expect(tempRepo.update).toHaveBeenCalledWith(
        {
          result_id: 10,
          is_active: true,
          institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE,
        },
        { is_active: false },
      );
    });

    it('soft-deletes only — never a hard delete (R-IUA-003 scenario, reused for organizations)', async () => {
      const tempRepo = buildTempRepo();
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      // One row, not an empty array: a delete/remove/softDelete call placed
      // inside the per-row loop body would never execute against [], and
      // would never be caught by this test.
      const row = {
        institution_type_id: 5,
        is_organization_known: false,
        organization_count: 2,
      } as InnovationUseOrganizationDto;

      await service.customSaveInnovationUse(10, [row], mockManager);

      expect(tempRepo.update).toHaveBeenCalledWith(expect.anything(), {
        is_active: false,
      });
      expect(tempRepo.delete).not.toHaveBeenCalled();
      expect(tempRepo.remove).not.toHaveBeenCalled();
      expect(tempRepo.softDelete).not.toHaveBeenCalled();
    });

    it('update path: saves an organization row with organization_count, is_active: true, and the value reads back identically (R-IUA-007 AC.1)', async () => {
      const tempRepo = buildTempRepo();
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      const row = {
        result_institution_type_id: 77,
        institution_type_id: 5,
        is_organization_known: false,
        organization_count: 12,
      } as InnovationUseOrganizationDto;

      const result = await service.customSaveInnovationUse(
        10,
        [row],
        mockManager,
      );

      expect(tempRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_institution_type_id: 77,
            institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE,
            organization_count: 12,
            is_active: true,
          }),
        ]),
      );
      expect((result as any)[0].organization_count).toBe(12);
    });

    it('update path, is_organization_known branch: organization_count is still carried through', async () => {
      const tempRepo = buildTempRepo();
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      const row = {
        result_institution_type_id: 78,
        is_organization_known: true,
        institution_id: 900,
        organization_count: 4,
      } as InnovationUseOrganizationDto;

      await service.customSaveInnovationUse(10, [row], mockManager);

      expect(tempRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_institution_type_id: 78,
            is_organization_known: true,
            organization_count: 4,
            is_active: true,
          }),
        ]),
      );
    });

    it('insert path: a row without organization_count saves (draft-save, R-IUA-007 AC.5), with is_active: true and organization_count null', async () => {
      const tempRepo = buildTempRepo();
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      const row = {
        institution_type_id: 5,
        is_organization_known: false,
      } as InnovationUseOrganizationDto;

      await service.customSaveInnovationUse(10, [row], mockManager);

      expect(tempRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_id: 10,
            institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE,
            organization_count: null,
            is_active: true,
          }),
        ]),
      );
    });

    it('insert path: organization_count is carried through buildDataTemplate, and the lookup where-clause is role-scoped via constructWhereClause', async () => {
      const findOne = jest.fn().mockResolvedValue(null);
      const tempRepo = buildTempRepo({ findOne });
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      const row = {
        institution_type_id: 5,
        is_organization_known: false,
        organization_count: 7,
      } as InnovationUseOrganizationDto;

      await service.customSaveInnovationUse(10, [row], mockManager);

      expect(findOne).toHaveBeenCalledWith({
        where: {
          result_id: 10,
          institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE,
          institution_type_id: 5,
          sub_institution_type_id: IsNull(),
          institution_type_custom_name: IsNull(),
        },
      });
      expect(tempRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ organization_count: 7, is_active: true }),
        ]),
      );
    });

    it('insert path, is_organization_known branch: organization_count is carried through, and the lookup where-clause is role-scoped via buildWhereClause', async () => {
      const findOne = jest.fn().mockResolvedValue(null);
      const tempRepo = buildTempRepo({ findOne });
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      const row = {
        is_organization_known: true,
        institution_id: 901,
        organization_count: 9,
      } as InnovationUseOrganizationDto;

      await service.customSaveInnovationUse(10, [row], mockManager);

      expect(findOne).toHaveBeenCalledWith({
        where: {
          result_id: 10,
          institution_id: 901,
          institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE,
        },
      });
      expect(tempRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ organization_count: 9, is_active: true }),
        ]),
      );
    });

    it('removing a row from the payload leaves exactly that row deactivated (R-IUA-007 AC.3) — the deactivate-then-reactivate-included pattern', async () => {
      const tempRepo = buildTempRepo();
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      // Row 78 was previously saved but is absent from this payload — it is
      // never reactivated. Only row 77, resent here, is.
      const row = {
        result_institution_type_id: 77,
        institution_type_id: 5,
        is_organization_known: false,
        organization_count: 3,
      } as InnovationUseOrganizationDto;

      await service.customSaveInnovationUse(10, [row], mockManager);

      expect(tempRepo.update).toHaveBeenCalledWith(
        {
          result_id: 10,
          is_active: true,
          institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE,
        },
        { is_active: false },
      );
      expect(tempRepo.save.mock.calls[0][0]).toHaveLength(1);
      expect(tempRepo.save).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            result_institution_type_id: 77,
            is_active: true,
          }),
        ]),
      );
    });
  });

  // T-04 role-parameterisation leak checks. `resolveOrganizationCount`
  // (result-institution-types.service.ts) is the single place deciding
  // whether `organization_count` is written; these regressions prove the
  // Dev role never gains the key even when the incoming object happens to
  // carry it — the check that matters most for "parameterising a shared
  // private helper is where an additive change stops being additive."
  describe('customSaveInnovationDev — role-parameterisation leak checks (T-04)', () => {
    it('never writes organization_count on the insert path, even if the incoming object carries the property', async () => {
      const tempRepo = buildTempRepo();
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      // CreateResultInstitutionTypeDto has no organization_count field at
      // all; this simulates the value being present on the object anyway.
      const data = [
        {
          institution_type_id: 5,
          sub_institution_type_id: null,
          is_organization_known: false,
          organization_count: 999,
        } as any,
      ];

      await service.customSaveInnovationDev(10, data, mockManager);

      const savedRow = tempRepo.save.mock.calls[0][0][0];
      expect(savedRow).not.toHaveProperty('organization_count');
    });

    it('never writes organization_count on the update path, even if the incoming object carries the property', async () => {
      const tempRepo = buildTempRepo();
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      const data = [
        {
          result_institution_type_id: 5,
          institution_type_id: 5,
          is_organization_known: false,
          organization_count: 999,
        } as any,
      ];

      await service.customSaveInnovationDev(10, data, mockManager);

      const savedRow = tempRepo.save.mock.calls[0][0][0];
      expect(savedRow).not.toHaveProperty('organization_count');
    });
  });
});
