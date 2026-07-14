import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaLeversService } from './clarisa-levers.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';
import { AppConfig } from '../../../../shared/utils/app-config.util';
import { ClarisaLever } from './entities/clarisa-lever.entity';

describe('ClarisaLeversService', () => {
  let service: ClarisaLeversService;
  const mockFindOne = jest.fn();

  beforeEach(async () => {
    mockFindOne.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaLeversService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: jest.fn(),
              findOne: mockFindOne,
              save: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              createQueryBuilder: jest.fn(),
              metadata: { columns: [], relations: [] },
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: {} },
        {
          provide: AppConfig,
          useValue: { BUCKET_URL: 'https://bucket.example' },
        },
      ],
    }).compile();

    service = module.get<ClarisaLeversService>(ClarisaLeversService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveIconUrl', () => {
    it('should resolve icon URL for a known short_name', () => {
      expect(service.resolveIconUrl('Lever 3')).toBe(
        'https://bucket.example/images/levers/L3-Climate-Action_COLOR.png',
      );
    });

    it('should resolve icon URL from a longer lever label prefix', () => {
      expect(service.resolveIconUrl('Lever 3 - Climate Action')).toBe(
        'https://bucket.example/images/levers/L3-Climate-Action_COLOR.png',
      );
    });

    it('should return null for unknown levers', () => {
      expect(service.resolveIconUrl('UnknownLever')).toBeNull();
    });
  });

  // [CLAUDE/DONE] 183
  describe('iconMapper', () => {
    it('should add icon URL when short_name matches LeverIcon map', () => {
      const levers = [
        { short_name: 'Lever 1' },
        { short_name: 'Lever 2' },
      ] as ClarisaLever[];

      const result = service.iconMapper(levers);

      expect(result[0].icon).toBe(
        'https://bucket.example/images/levers/L1-Food-environment_COLOR.png',
      );
      expect(result[1].icon).toBe(
        'https://bucket.example/images/levers/L2-Multifuntional-Landscapes_COLOR.png',
      );
    });

    it('should set icon to null when short_name has no matching entry', () => {
      const levers = [{ short_name: 'UnknownLever' }] as ClarisaLever[];

      const result = service.iconMapper(levers);

      expect(result[0].icon).toBeNull();
    });

    it('should return empty array when input is empty', () => {
      const result = service.iconMapper([]);

      expect(result).toEqual([]);
    });

    it('should preserve all other lever properties', () => {
      const lever = { short_name: 'Lever 1', id: 10, name: 'Food' } as any;

      const [result] = service.iconMapper([lever]);

      expect(result.id).toBe(10);
      expect(result.short_name).toBe('Lever 1');
      expect((result as Record<string, unknown>).name).toBe('Food');
    });
  });

  // [CLAUDE/DONE] 184
  describe('homologatedData', () => {
    it.each([
      ['L1', 'Lever 1'],
      ['L2', 'Lever 2'],
      ['L3', 'Lever 3'],
      ['L4', 'Lever 4'],
      ['L5', 'Lever 5'],
      ['L6', 'Lever 6'],
      ['L7', 'Lever 7'],
      ['L8', 'Lever 8'],
    ])('should map "%s" to "%s"', (input, expected) => {
      expect(service.homologatedData(input)).toBe(expected);
    });

    it('should be case-insensitive', () => {
      expect(service.homologatedData('l1')).toBe('Lever 1');
      expect(service.homologatedData('L3')).toBe('Lever 3');
    });

    it('should trim whitespace before lookup', () => {
      expect(service.homologatedData('  L2  ')).toBe('Lever 2');
    });

    it('should return null for unknown keys', () => {
      expect(service.homologatedData('L99')).toBeNull();
      expect(service.homologatedData('Unknown')).toBeNull();
    });

    it('should return null when input is null or undefined', () => {
      expect(service.homologatedData(null)).toBeNull();
      expect(service.homologatedData(undefined)).toBeNull();
    });
  });

  describe('findByShortName', () => {
    it('should find a lever by short_name', async () => {
      const lever = {
        id: 3,
        short_name: 'Lever 3',
        full_name: 'Lever 3: Climate Action',
      } as ClarisaLever;
      mockFindOne.mockResolvedValue(lever);

      const result = await service.findByShortName('Lever 3');

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { short_name: 'Lever 3' },
      });
      expect(result).toEqual(lever);
    });

    it('should return null when no lever matches short_name', async () => {
      mockFindOne.mockResolvedValue(null);

      const result = await service.findByShortName('Unknown');

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { short_name: 'Unknown' },
      });
      expect(result).toBeNull();
    });
  });
});
