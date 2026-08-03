import { DataSource, EntityManager } from 'typeorm';
import { ResultPoolFundingTocAlignment } from '../entities/result-pool-funding-toc-alignment.entity';
import {
  ResultPoolFundingTocAlignmentRepository,
  TocAlignmentUpsertInput,
} from './result-pool-funding-toc-alignment.repository';

// @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-05 / R-BIL-092, R-BIL-095

describe('ResultPoolFundingTocAlignmentRepository', () => {
  let repository: ResultPoolFundingTocAlignmentRepository;

  const dataSource = {
    createEntityManager: jest.fn().mockReturnValue({}),
  } as unknown as DataSource;

  const baseInput: TocAlignmentUpsertInput = {
    result_id: 101,
    sp_code: 'SP01',
    aligns_with_toc: true,
    level: 'OUTPUT',
    toc_result_id: 7,
    indicator_id: 12,
    quantitative_contribution: 3.5,
    toc_result_title: 'ToC result title',
    indicator_description: 'Indicator description',
    unit_messurament: 'Number',
    target_value: '40',
    target_year: 2026,
  };

  beforeEach(() => {
    repository = new ResultPoolFundingTocAlignmentRepository(dataSource);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('findActiveByResultId', () => {
    it('filters by result + is_active and orders by sp_code', async () => {
      const rows = [
        { id: 1, sp_code: 'SP01' },
      ] as ResultPoolFundingTocAlignment[];
      const findSpy = jest.spyOn(repository, 'find').mockResolvedValue(rows);

      await expect(repository.findActiveByResultId(101)).resolves.toBe(rows);

      expect(findSpy).toHaveBeenCalledWith({
        where: { result_id: 101, is_active: true },
        order: { sp_code: 'ASC' },
      });
    });
  });

  describe('upsertForSp', () => {
    it('inserts a new row when no active row exists for (result, sp)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue(null);
      const createSpy = jest
        .spyOn(repository, 'create')
        .mockImplementation(
          (entity) => entity as ResultPoolFundingTocAlignment,
        );
      const saveSpy = jest
        .spyOn(repository, 'save')
        .mockImplementation(async (entity) => ({ id: 9, ...entity }) as any);
      const updateSpy = jest.spyOn(repository, 'update');

      const saved = await repository.upsertForSp(baseInput, 555);

      expect(updateSpy).not.toHaveBeenCalled();
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          result_id: 101,
          sp_code: 'SP01',
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 7,
          indicator_id: 12,
          quantitative_contribution: 3.5,
          toc_result_title: 'ToC result title',
          indicator_description: 'Indicator description',
          unit_messurament: 'Number',
          target_value: '40',
          target_year: 2026,
          created_by: 555,
          updated_by: 555,
        }),
      );
      expect(saveSpy).toHaveBeenCalledTimes(1);
      expect(saved.id).toBe(9);
    });

    it('updates the active row in place — never inserts a second active row', async () => {
      const existing = { id: 4 } as ResultPoolFundingTocAlignment;
      const findOneSpy = jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({
          ...existing,
          aligns_with_toc: false,
        } as ResultPoolFundingTocAlignment);
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      const saveSpy = jest.spyOn(repository, 'save');

      const result = await repository.upsertForSp(
        { result_id: 101, sp_code: 'SP01', aligns_with_toc: false },
        555,
      );

      expect(findOneSpy).toHaveBeenNthCalledWith(1, {
        where: { result_id: 101, sp_code: 'SP01', is_active: true },
      });
      expect(updateSpy).toHaveBeenCalledWith(
        { id: 4 },
        expect.objectContaining({
          aligns_with_toc: false,
          updated_by: 555,
        }),
      );
      expect(saveSpy).not.toHaveBeenCalled();
      expect(result.aligns_with_toc).toBe(false);
    });

    // @sdd-spec docs/specs/bilateral-module/toc-mapping-v2 — T-08 / R-BIL-092 AC.3
    it('re-submitting the same SP with a DIFFERENT indicator updates the single active row in place with the new snapshots — no second active row', async () => {
      const existing = {
        id: 4,
        indicator_id: 12,
      } as ResultPoolFundingTocAlignment;
      jest
        .spyOn(repository, 'findOne')
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({
          ...existing,
          indicator_id: 6001,
        } as ResultPoolFundingTocAlignment);
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({ affected: 1 } as any);
      const saveSpy = jest.spyOn(repository, 'save');
      const createSpy = jest.spyOn(repository, 'create');

      const result = await repository.upsertForSp(
        {
          ...baseInput,
          indicator_id: 6001,
          indicator_description: 'Replacement indicator description',
          target_value: '4',
        },
        555,
      );

      // Same row id, new indicator + snapshots — never a new insert.
      expect(updateSpy).toHaveBeenCalledWith(
        { id: 4 },
        expect.objectContaining({
          aligns_with_toc: true,
          level: 'OUTPUT',
          toc_result_id: 7,
          indicator_id: 6001,
          indicator_description: 'Replacement indicator description',
          target_value: '4',
          updated_by: 555,
        }),
      );
      expect(saveSpy).not.toHaveBeenCalled();
      expect(createSpy).not.toHaveBeenCalled();
      expect(result.id).toBe(4);
      expect(result.indicator_id).toBe(6001);
    });

    it('nulls every ToC/snapshot column when the input omits them ("No" answer)', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValue({
        id: 4,
      } as ResultPoolFundingTocAlignment);
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({ affected: 1 } as any);

      await repository.upsertForSp(
        { result_id: 101, sp_code: 'SP01', aligns_with_toc: false },
        555,
      );

      expect(updateSpy).toHaveBeenCalledWith(
        { id: 4 },
        {
          aligns_with_toc: false,
          level: null,
          toc_result_id: null,
          indicator_id: null,
          quantitative_contribution: null,
          toc_result_title: null,
          indicator_description: null,
          unit_messurament: null,
          target_value: null,
          target_year: null,
          updated_by: 555,
        },
      );
    });

    it('uses the provided EntityManager repository inside an outer transaction', async () => {
      const txRepo = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation((entity) => entity),
        save: jest
          .fn()
          .mockImplementation(async (entity) => ({ id: 1, ...entity })),
        update: jest.fn(),
      };
      const manager = {
        getRepository: jest.fn().mockReturnValue(txRepo),
      } as unknown as EntityManager;
      const ownFindOneSpy = jest.spyOn(repository, 'findOne');
      const ownSaveSpy = jest.spyOn(repository, 'save');

      await repository.upsertForSp(baseInput, 555, manager);

      expect(manager.getRepository).toHaveBeenCalledWith(
        ResultPoolFundingTocAlignment,
      );
      expect(txRepo.findOne).toHaveBeenCalled();
      expect(txRepo.save).toHaveBeenCalledTimes(1);
      expect(ownFindOneSpy).not.toHaveBeenCalled();
      expect(ownSaveSpy).not.toHaveBeenCalled();
    });
  });

  describe('deactivateForSps', () => {
    it('soft-deactivates active rows for the given SPs with audit fields', async () => {
      const updateSpy = jest
        .spyOn(repository, 'update')
        .mockResolvedValue({ affected: 2 } as any);

      const affected = await repository.deactivateForSps(
        101,
        ['SP01', 'SP02'],
        555,
      );

      expect(affected).toBe(2);
      const [criteria, payload] = updateSpy.mock.calls[0];
      expect(criteria).toMatchObject({ result_id: 101, is_active: true });
      expect(payload).toMatchObject({
        is_active: false,
        updated_by: 555,
      });
      expect((payload as any).deleted_at).toBeInstanceOf(Date);
    });

    it('short-circuits and touches nothing when spCodes is empty', async () => {
      const updateSpy = jest.spyOn(repository, 'update');

      await expect(repository.deactivateForSps(101, [], 555)).resolves.toBe(0);

      expect(updateSpy).not.toHaveBeenCalled();
    });

    it('routes through the provided EntityManager when given', async () => {
      const txRepo = {
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      };
      const manager = {
        getRepository: jest.fn().mockReturnValue(txRepo),
      } as unknown as EntityManager;
      const ownUpdateSpy = jest.spyOn(repository, 'update');

      const affected = await repository.deactivateForSps(
        101,
        ['SP03'],
        555,
        manager,
      );

      expect(affected).toBe(1);
      expect(manager.getRepository).toHaveBeenCalledWith(
        ResultPoolFundingTocAlignment,
      );
      expect(ownUpdateSpy).not.toHaveBeenCalled();
    });
  });
});
