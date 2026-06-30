import { Test, TestingModule } from '@nestjs/testing';
import { ResultLeversService } from './result-levers.service';
import { ResultLeversRepository } from './repositories/result-levers.repository';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { LeverRolesEnum } from '../lever-roles/enum/lever-roles.enum';

describe('ResultLeversService', () => {
  let service: ResultLeversService;
  const mockUpdate = jest.fn();
  const mockFind = jest.fn();

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ updated_by: 1 }),
  };

  const mockSave = jest.fn();

  const mockRepo = {
    update: mockUpdate,
    find: mockFind,
    save: mockSave,
    metadata: { primaryColumns: [{ propertyName: 'result_lever_id' }] },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultLeversService,
        {
          provide: ResultLeversRepository,
          useValue: mockRepo,
        },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ResultLeversService>(ResultLeversService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 85
  describe('deleteAll', () => {
    it('should soft-delete all levers for the given result_id', async () => {
      mockUpdate.mockResolvedValue({ affected: 2 });

      await service.deleteAll(10);

      expect(mockUpdate).toHaveBeenCalledWith(
        { result_id: 10 },
        expect.objectContaining({ is_active: false }),
      );
    });
  });

  describe('create', () => {
    beforeEach(() => {
      mockFind.mockResolvedValue([]);
      mockUpdate.mockResolvedValue({ affected: 0 });
      mockSave.mockResolvedValue([
        {
          result_lever_id: 1,
          result_id: 10,
          lever_id: '100',
          is_primary: true,
          custom_lever_name: 'Custom lever name',
          is_active: true,
        },
      ]);
      mockCurrentUser.audit.mockReturnValue({
        created_by: 1,
        updated_by: 1,
      });
    });

    it('should persist custom_lever_name when passed via otherAttributes', async () => {
      await service.create(
        10,
        [
          {
            lever_id: '100',
            is_primary: true,
            custom_lever_name: 'Custom lever name',
          },
        ],
        'lever_id',
        LeverRolesEnum.ALIGNMENT,
        undefined,
        ['is_primary', 'custom_lever_name'],
      );

      expect(mockSave).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            lever_id: '100',
            is_primary: true,
            custom_lever_name: 'Custom lever name',
          }),
        ]),
      );
    });
  });

  // [CLAUDE/DONE] 86
  describe('comparerClientToServer', () => {
    it('should fetch server levers and return updateArray result when serverResultLevers not provided', async () => {
      const serverLevers = [
        { result_lever_id: 1, lever_id: 'L1', result_id: 10 },
      ];
      const clientLevers = [{ lever_id: 'L1' }, { lever_id: 'L2' }];
      mockFind.mockResolvedValue(serverLevers);

      const result = await service.comparerClientToServer(
        10,
        clientLevers as any,
        LeverRolesEnum.ALIGNMENT,
      );

      expect(mockFind).toHaveBeenCalledWith({
        where: {
          result_id: 10,
          is_active: true,
          lever_role_id: LeverRolesEnum.ALIGNMENT,
        },
      });
      expect(result).toBeDefined();
    });

    it('should use provided serverResultLevers without querying', async () => {
      const serverLevers = [
        { result_lever_id: 1, lever_id: 'L1', result_id: 10 },
      ];
      const clientLevers = [{ lever_id: 'L1' }];

      const result = await service.comparerClientToServer(
        10,
        clientLevers as any,
        LeverRolesEnum.ALIGNMENT,
        serverLevers as any,
      );

      expect(mockFind).not.toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });
});
