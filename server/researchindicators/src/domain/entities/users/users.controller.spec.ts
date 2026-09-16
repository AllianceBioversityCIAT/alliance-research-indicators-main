// Unit tests for UsersController.findActiveUsers
//
// Strategy: create a testing module with UsersService mocked as a manual mock.
// Assert that the handler calls the correct service method with the parsed
// query argument, and wraps the result in ResponseUtils.format.
//
// KZ-001: assert on argument values passed to the service, not bare call count.

import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { ActiveUserResponseDto } from './dto/active-user-response.dto';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ACTIVE_USERS_FIXTURE: ActiveUserResponseDto[] = [
  {
    sec_user_id: 1,
    first_name: 'Alice',
    last_name: 'Smith',
    email: 'a.smith@cgiar.org',
    carnet: 'C00001',
  },
  {
    sec_user_id: 2,
    first_name: 'Bob',
    last_name: 'Doe',
    email: 'b.doe@cgiar.org',
    carnet: null,
  },
];

// ─── Mock service factory ─────────────────────────────────────────────────────

function makeMockService() {
  return {
    findActiveUsers: jest.fn().mockResolvedValue(ACTIVE_USERS_FIXTURE),
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('UsersController', () => {
  let controller: UsersController;
  let mockService: ReturnType<typeof makeMockService>;

  beforeEach(async () => {
    mockService = makeMockService();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockService,
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  // ── 1. No search: delegates to service and wraps response ────────────────

  it('calls findActiveUsers with undefined when no search is supplied', async () => {
    const result = await controller.findActiveUsers({ search: undefined });

    expect(mockService.findActiveUsers).toHaveBeenCalledWith(undefined);
    expect(result).toEqual({
      description: 'Active users',
      status: HttpStatus.OK,
      data: ACTIVE_USERS_FIXTURE,
    });
  });

  // ── 2. With search: passes search term through ───────────────────────────

  it('passes search string to findActiveUsers', async () => {
    await controller.findActiveUsers({ search: 'jane' });

    expect(mockService.findActiveUsers).toHaveBeenCalledWith('jane');
  });

  // ── 3. Empty result: response wraps empty array ──────────────────────────

  it('wraps an empty array when service returns no users', async () => {
    mockService.findActiveUsers.mockResolvedValueOnce([]);

    const result = await controller.findActiveUsers({ search: 'nomatch' });

    expect(result).toEqual({
      description: 'Active users',
      status: HttpStatus.OK,
      data: [],
    });
  });
});
