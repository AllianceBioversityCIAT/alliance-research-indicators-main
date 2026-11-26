import { BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ResultOicrAnnexesService } from './result-oicr-annexes.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';

describe('ResultOicrAnnexesService', () => {
  const find = jest.fn();
  const save = jest.fn(async (rows) => rows);
  const execute = jest.fn().mockResolvedValue(undefined);
  const whereInIds = jest.fn(() => ({ execute }));
  const set = jest.fn(() => ({ whereInIds }));
  const repo = {
    find,
    save,
    metadata: { primaryColumns: [{ propertyName: 'id' }] },
    createQueryBuilder: jest.fn(() => ({
      update: jest.fn(() => ({ set })),
    })),
  };
  const dataSource = { getRepository: jest.fn(() => repo) };
  const user = {
    audit: jest.fn((kind: number) =>
      kind === 1 ? { updated_by: 7 } : { created_by: 7, updated_by: 7 },
    ),
  };
  let service: ResultOicrAnnexesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ResultOicrAnnexesService(
      dataSource as unknown as DataSource,
      user as unknown as CurrentUserUtil,
    );
  });

  it('findByResult returns active rows ordered by id', async () => {
    find.mockResolvedValue([{ id: 1 }]);
    expect(await service.findByResult(5)).toEqual([{ id: 1 }]);
    expect(find).toHaveBeenCalledWith({
      where: { result_id: 5, is_active: true },
      order: { id: 'ASC' },
    });
  });

  describe('validateAndNormalize', () => {
    it('rejects a non-array', () => {
      expect(() => service.validateAndNormalize({})).toThrow(
        BadRequestException,
      );
    });

    it.each([0, 4, null, undefined, 'x'])('rejects annex_type_id %p', (id) => {
      expect(() =>
        service.validateAndNormalize([{ annex_type_id: id }]),
      ).toThrow(BadRequestException);
    });

    it('rejects an unknown file_type for type 2', () => {
      expect(() =>
        service.validateAndNormalize([{ annex_type_id: 2, file_type: 'Pie' }]),
      ).toThrow(/file_type/);
    });

    it('rejects an unknown partner_consent for type 3', () => {
      expect(() =>
        service.validateAndNormalize([
          { annex_type_id: 3, partner_consent: 'Maybe' },
        ]),
      ).toThrow(/partner_consent/);
    });

    it('accepts every listed value and drafts with empty fields', () => {
      for (const file_type of ['Map', 'Figure', 'Table', 'Graph']) {
        expect(
          service.validateAndNormalize([{ annex_type_id: 2, file_type }])[0]
            .file_type,
        ).toBe(file_type);
      }
      for (const partner_consent of ['Yes', 'No', 'Not applicable']) {
        expect(
          service.validateAndNormalize([
            { annex_type_id: 3, partner_consent },
          ])[0].partner_consent,
        ).toBe(partner_consent);
      }
      expect(service.validateAndNormalize([{ annex_type_id: 1 }])).toEqual([
        {
          id: undefined,
          annex_type_id: 1,
          description: null,
          photo_credits: null,
          file_type: null,
          partner_consent: null,
          link: null,
        },
      ]);
    });

    it('nulls fields that do not belong to the type, and does not validate them', () => {
      const [photo, map, partner] = service.validateAndNormalize([
        {
          annex_type_id: 1,
          description: 'd',
          link: 'l',
          photo_credits: 'c',
          file_type: 'Pie',
          partner_consent: 'Maybe',
        },
        {
          annex_type_id: 2,
          description: 'd',
          link: 'l',
          file_type: 'Map',
          photo_credits: 'c',
          partner_consent: 'Yes',
        },
        {
          annex_type_id: 3,
          description: 'd',
          link: 'l',
          partner_consent: 'No',
          photo_credits: 'c',
          file_type: 'Map',
        },
      ]);
      expect(photo).toMatchObject({
        photo_credits: 'c',
        file_type: null,
        partner_consent: null,
      });
      expect(map).toMatchObject({
        file_type: 'Map',
        photo_credits: null,
        partner_consent: null,
      });
      expect(partner).toMatchObject({
        partner_consent: 'No',
        photo_credits: null,
        file_type: null,
      });
    });
  });

  describe('replace', () => {
    it('updates by id, inserts without id, deactivates the rest', async () => {
      find.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      await service.replace(9, [
        { id: 1, annex_type_id: 1, description: 'a', link: 'l' },
        { annex_type_id: 3, description: 'p', link: 'l2' },
      ]);

      expect(set).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false, updated_by: 7 }),
      );
      expect(whereInIds).toHaveBeenCalledWith([2]);
      const saved = save.mock.calls[0][0];
      expect(saved).toHaveLength(2);
      expect(saved[0]).toMatchObject({
        id: 1,
        result_id: 9,
        is_active: true,
        updated_by: 7,
      });
      expect(saved[0].created_by).toBeUndefined();
      expect(saved[1]).toMatchObject({
        id: undefined,
        result_id: 9,
        annex_type_id: 3,
        created_by: 7,
      });
    });

    it('treats an id that is not stored for this result as an insert', async () => {
      find.mockResolvedValue([{ id: 1 }]);
      await service.replace(9, [{ id: 99, annex_type_id: 1 }]);
      expect(save.mock.calls[0][0][0].id).toBeUndefined();
      expect(whereInIds).toHaveBeenCalledWith([1]);
    });

    it('deactivates everything and saves nothing for []', async () => {
      find.mockResolvedValue([{ id: 1 }, { id: 2 }]);
      const out = await service.replace(9, []);
      expect(whereInIds).toHaveBeenCalledWith([1, 2]);
      expect(save).not.toHaveBeenCalled();
      expect(out).toEqual([]);
    });

    it('does not touch the table when nothing changes shape', async () => {
      find.mockResolvedValue([]);
      await service.replace(9, []);
      expect(whereInIds).not.toHaveBeenCalled();
    });

    it('uses the transaction manager when given', async () => {
      const managerRepo = { ...repo, find: jest.fn().mockResolvedValue([]) };
      const manager = { getRepository: jest.fn(() => managerRepo) };
      await service.replace(9, [{ annex_type_id: 1 }], manager as never);
      expect(manager.getRepository).toHaveBeenCalled();
      expect(managerRepo.save).toHaveBeenCalled();
    });

    it('throws 400 before writing on an invalid annex', async () => {
      await expect(service.replace(9, [{ annex_type_id: 7 }])).rejects.toThrow(
        BadRequestException,
      );
      expect(find).not.toHaveBeenCalled();
      expect(save).not.toHaveBeenCalled();
    });
  });
});
