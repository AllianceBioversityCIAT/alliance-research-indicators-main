import { BadRequestException } from '@nestjs/common';
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
      find?: jest.Mock;
      findOne?: jest.Mock;
      update?: jest.Mock;
      save?: jest.Mock;
    } = {},
  ) => ({
    // FAIL-1 remediation (2026-08-20): `customSaveInnovationUse` now runs
    // `assertInnovationUseOwnership` first, which calls `tempRepo.find(...)`
    // to confirm a submitted `result_institution_type_id` belongs to this
    // `(result_id, role)`. Defaulted to an empty result — safe for every
    // test whose payload carries NO id (the check short-circuits before
    // calling `find` at all) and for every `customSaveInnovationDev` test
    // (that method never calls this check). Tests whose payload DOES carry
    // an id override this to resolve the matching row, simulating ownership
    // confirmed.
    find: overrides.find ?? jest.fn().mockResolvedValue([]),
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
      // FAIL-1 remediation: ownership check — see `buildTempRepo` comment.
      const find = jest
        .fn()
        .mockResolvedValue([{ result_institution_type_id: 77 }]);
      const tempRepo = buildTempRepo({ find });
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
      // FAIL-1 remediation: ownership check — see `buildTempRepo` comment.
      const find = jest
        .fn()
        .mockResolvedValue([{ result_institution_type_id: 78 }]);
      const tempRepo = buildTempRepo({ find });
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
      // FAIL-1 remediation: ownership check — see `buildTempRepo` comment.
      const find = jest
        .fn()
        .mockResolvedValue([{ result_institution_type_id: 77 }]);
      const tempRepo = buildTempRepo({ find });
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

  // FAIL-1 remediation, attempt 2 (2026-08-20, `validation-report.md`).
  // Attempt 1 shipped `assertInnovationUseOwnership` with zero unit-level
  // coverage: both fixture attack payloads submit a bad ACTOR id alongside
  // the bad org id, so `ResultActorsService`'s check always throws first and
  // this org branch was never reached by any test at any tier. These tests
  // close that gap directly against this service, with no DB involved.
  describe('customSaveInnovationUse — assertInnovationUseOwnership (FAIL-1 remediation, attempt 2)', () => {
    it('rejects with BadRequestException carrying the design.md §4 error string, and persists nothing, when a submitted result_institution_type_id resolves to no owned row', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = buildTempRepo({ find, update, save });
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      const row = {
        result_institution_type_id: 999,
        institution_type_id: 5,
        is_organization_known: false,
      } as InnovationUseOrganizationDto;

      let caught: BadRequestException | undefined;
      try {
        await service.customSaveInnovationUse(10, [row], mockManager);
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught.getResponse() as { message: string[] }).message).toEqual([
        'result_institution_type_id: unknown or unauthorized organization row — 999',
      ]);
      // "Persists nothing in this method" made falsifiable, not narrated.
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    // Mutation-survivor pair. Unlike the test above (find() resolves an
    // unconditional value), `find` here re-implements real WHERE-clause
    // semantics against ONE seeded row: a condition present in the query
    // narrows the match; a condition ABSENT from the query (as it would be
    // if a future edit deleted it from `assertInnovationUseOwnership`)
    // matches unconditionally — mirroring how dropping a clause from a real
    // SQL WHERE widens the result set instead of narrowing it. Each test
    // seeds a row that fails exactly one of the two guard columns, so if
    // that column's condition is ever removed from the query, the row
    // wrongly resolves as owned, no exception is thrown, and
    // `.rejects.toThrow(...)` below fails — turning the falsification-table
    // finding in this task's report into something the suite re-proves.
    const buildRealisticFindMock = (seededRow: {
      result_institution_type_id: number;
      result_id: number;
      institution_type_role_id: InstitutionTypeRoleEnum;
    }) =>
      jest.fn().mockImplementation(({ where }) => {
        const resultIdOk =
          !('result_id' in where) || where.result_id === seededRow.result_id;
        const roleOk =
          !('institution_type_role_id' in where) ||
          where.institution_type_role_id === seededRow.institution_type_role_id;
        return Promise.resolve(resultIdOk && roleOk ? [seededRow] : []);
      });

    it('mutation-survivor: a row belonging to a DIFFERENT result_id (correct role) is rejected — proves result_id is load-bearing in the ownership predicate', async () => {
      const find = buildRealisticFindMock({
        result_institution_type_id: 77,
        result_id: 999,
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_USE,
      });
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = buildTempRepo({ find, update, save });
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      const row = {
        result_institution_type_id: 77,
        institution_type_id: 5,
        is_organization_known: false,
      } as InnovationUseOrganizationDto;

      await expect(
        service.customSaveInnovationUse(10, [row], mockManager),
      ).rejects.toThrow(BadRequestException);
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('mutation-survivor: a row belonging to the SAME result but a DIFFERENT role (Innovation Dev) is rejected — proves institution_type_role_id is load-bearing in the ownership predicate', async () => {
      const find = buildRealisticFindMock({
        result_institution_type_id: 78,
        result_id: 10,
        institution_type_role_id: InstitutionTypeRoleEnum.INNOVATION_DEV,
      });
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = buildTempRepo({ find, update, save });
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      const row = {
        result_institution_type_id: 78,
        institution_type_id: 5,
        is_organization_known: false,
      } as InnovationUseOrganizationDto;

      await expect(
        service.customSaveInnovationUse(10, [row], mockManager),
      ).rejects.toThrow(BadRequestException);
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    // Rework attempt 2 (2026-08-20). `assertInnovationUseOwnership` derives
    // `idsPresent` straight off the raw payload with no identity-keyed
    // dedup (that dedup — `removeDuplicates`/`uniqueData` — is deliberately
    // NOT what this guard reads; see the FAIL-B block below). Without a
    // `[...new Set(...)]` on `idsPresent` itself, a payload that repeats the
    // SAME unauthorized id twice produced a `400` message listing it twice
    // (`— 999, 999`), which this test would catch as a mismatch against the
    // single-occurrence string below.
    it('lists a repeated unauthorized result_institution_type_id only once in the 400 message', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = buildTempRepo({ find, update, save });
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      const row1 = {
        result_institution_type_id: 999,
        institution_type_id: 5,
        is_organization_known: false,
      } as InnovationUseOrganizationDto;
      const row2 = {
        result_institution_type_id: 999,
        institution_type_id: 3,
        sub_institution_type_id: 9,
        is_organization_known: false,
      } as InnovationUseOrganizationDto;

      let caught: BadRequestException | undefined;
      try {
        await service.customSaveInnovationUse(10, [row1, row2], mockManager);
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught.getResponse() as { message: string[] }).message).toEqual([
        'result_institution_type_id: unknown or unauthorized organization row — 999',
      ]);
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });
  });

  // FAIL-B remediation (2026-08-20, `validation-report.md`). Independent
  // auditor finding: `customSaveInnovationUse` used to run
  // `assertInnovationUseOwnership` against `removeDuplicates`'s OUTPUT
  // (`uniqueData`), not the raw payload. `removeDuplicates` keys on identity
  // columns only — never on `result_institution_type_id` — and is
  // last-write-wins, so a payload pairing an unauthorized id with a LATER
  // row sharing the same identity key had the unauthorized row silently
  // dropped before the guard ever saw it: a `200`, not the `400` design.md
  // §15 promises. These tests seed exactly that shape and assert the
  // rejection — they fail red against the pre-fix code (guarding
  // `uniqueData`) because the unauthorized row never reaches the check.
  describe('customSaveInnovationUse — assertInnovationUseOwnership sees the RAW payload, not the deduplicated one (FAIL-B remediation)', () => {
    it('rejects an unauthorized result_institution_type_id even when a later row in the same payload shares its institution_type_id and would dedupe it away', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = buildTempRepo({ find, update, save });
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      // Both rows key to `type_5` in `removeDuplicates` (neither is OTHER,
      // neither carries `sub_institution_type_id`) — last-write-wins keeps
      // only the second, id-less row. If the guard ran against that
      // deduplicated array, the unauthorized id (999) would never be
      // checked at all and this save would silently succeed.
      const victimRow = {
        result_institution_type_id: 999,
        institution_type_id: 5,
        is_organization_known: false,
      } as InnovationUseOrganizationDto;
      const sameKeySibling = {
        institution_type_id: 5,
        is_organization_known: false,
        organization_count: 1,
      } as InnovationUseOrganizationDto;

      let caught: BadRequestException | undefined;
      try {
        await service.customSaveInnovationUse(
          10,
          [victimRow, sameKeySibling],
          mockManager,
        );
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught.getResponse() as { message: string[] }).message).toEqual([
        'result_institution_type_id: unknown or unauthorized organization row — 999',
      ]);
      // The whole save is rejected — never silently ignored or overwritten
      // (design.md §15) — so nothing downstream of the guard ever runs.
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });

    it('names every unauthorized row dropped by dedup, across two different identity-key shapes in one payload', async () => {
      const find = jest.fn().mockResolvedValue([]);
      const update = jest.fn();
      const save = jest.fn();
      const tempRepo = buildTempRepo({ find, update, save });
      const mockManager = {
        getRepository: jest.fn().mockReturnValue(tempRepo),
      } as any;

      // Pair 1 keys to `type_5` (plain `institution_type_id`); pair 2 keys
      // to `sub_9` (`sub_institution_type_id` set). Each victim is followed
      // by a same-key, id-less sibling that overwrites it in
      // `removeDuplicates`'s last-write-wins `Map` — so BOTH ids below are
      // absent from `uniqueData`, and only the raw-payload guard can see
      // either one.
      const victim1 = {
        result_institution_type_id: 111,
        institution_type_id: 5,
        is_organization_known: false,
      } as InnovationUseOrganizationDto;
      const sibling1 = {
        institution_type_id: 5,
        is_organization_known: false,
        organization_count: 1,
      } as InnovationUseOrganizationDto;
      const victim2 = {
        result_institution_type_id: 222,
        institution_type_id: 3,
        sub_institution_type_id: 9,
        is_organization_known: false,
      } as InnovationUseOrganizationDto;
      const sibling2 = {
        institution_type_id: 3,
        sub_institution_type_id: 9,
        is_organization_known: false,
        organization_count: 2,
      } as InnovationUseOrganizationDto;

      let caught: BadRequestException | undefined;
      try {
        await service.customSaveInnovationUse(
          10,
          [victim1, sibling1, victim2, sibling2],
          mockManager,
        );
      } catch (e) {
        caught = e as BadRequestException;
      }

      expect(caught).toBeInstanceOf(BadRequestException);
      expect((caught.getResponse() as { message: string[] }).message).toEqual([
        'result_institution_type_id: unknown or unauthorized organization row — 111, 222',
      ]);
      expect(update).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
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
