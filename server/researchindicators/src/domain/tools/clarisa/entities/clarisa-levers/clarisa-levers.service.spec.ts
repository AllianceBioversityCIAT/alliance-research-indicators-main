import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { ClarisaLeversService } from './clarisa-levers.service';
import { CurrentUserUtil } from '../../../../shared/utils/current-user.util';

describe('ClarisaLeversService', () => {
  let service: ClarisaLeversService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ClarisaLeversService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockReturnValue({
              find: jest.fn(),
              findOne: jest.fn(),
              save: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
              createQueryBuilder: jest.fn(),
              metadata: { columns: [], relations: [] },
            }),
          },
        },
        { provide: CurrentUserUtil, useValue: {} },
      ],
    }).compile();

    service = module.get<ClarisaLeversService>(ClarisaLeversService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

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
    ])('should return "%s" for input "%s"', (input, expected) => {
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
});
