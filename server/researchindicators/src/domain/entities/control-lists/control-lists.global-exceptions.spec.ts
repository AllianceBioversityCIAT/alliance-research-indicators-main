import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { ControlListsService } from './control-lists.service';
import { ControlListCategoryRepository } from './repositories/control-list-category.repository';
import { PortfoliosService } from '../portfolios/portfolios.service';
import { CurrentUserUtil } from '../../shared/utils/current-user.util';
import { GlobalExceptions } from '../../shared/error-management/global.exception';
import { LoggerUtil } from '../../shared/utils/logger.util';

/**
 * T-01 rework, Risk Reviewer issue 1 (verbatim): "the duplicate-name 409
 * never reaches the user as the server wrote it" — the service throws
 * `ConflictException({ message: { description, field } })`, and what the
 * CLIENT actually receives depends on what `GlobalExceptions` does with
 * that shape, not on what the service intended. This suite throws REAL
 * exceptions from the REAL `ControlListsService` (only the repository/
 * portfolio dependencies are mocked) through the REAL `GlobalExceptions`
 * filter and pins the exact JSON body on the wire.
 *
 * Leader decision: KEEP the server payload as-is (`errors: { description,
 * field }` for the 409). This file is the contract test the Risk Reviewer
 * asked for "so the contract is tested where it is produced (KZ-017)".
 */
describe('Control Lists — real GlobalExceptions contract (T-01 rework)', () => {
  let service: ControlListsService;
  let filter: GlobalExceptions;
  let errorSpy: jest.SpyInstance;

  const mockFindOne = jest.fn();
  const mockSave = jest.fn();
  const mockCategoryRepository = {
    find: jest.fn(),
    findOne: mockFindOne,
    count: jest.fn(),
    save: mockSave,
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPortfoliosFindOne = jest.fn();
  const mockPortfoliosService = {
    findOne: mockPortfoliosFindOne,
    findAll: jest.fn(),
  };

  const mockCurrentUser = {
    audit: jest.fn().mockReturnValue({ created_by: 1 }),
    user_id: 1,
  };

  function makeHost(request: any) {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const response = { status };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    };
    return { host, status, json };
  }

  beforeAll(() => {
    // GlobalExceptions logs via LoggerUtil._error on every catch; silence it
    // the same way global.exception.spec.ts does, so this suite stays about
    // the JSON body, not console noise.
    errorSpy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
  });

  afterAll(() => {
    errorSpy.mockRestore();
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    mockCurrentUser.audit.mockReturnValue({ created_by: 1 });
    jest
      .spyOn(LoggerUtil.prototype, '_log')
      .mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControlListsService,
        {
          provide: ControlListCategoryRepository,
          useValue: mockCategoryRepository,
        },
        { provide: PortfoliosService, useValue: mockPortfoliosService },
        { provide: CurrentUserUtil, useValue: mockCurrentUser },
      ],
    }).compile();

    service = module.get<ControlListsService>(ControlListsService);
    filter = new GlobalExceptions();
  });

  it('409 duplicate name: errors is the OBJECT {description, field: "name"}, description is the exception name', async () => {
    mockPortfoliosFindOne.mockResolvedValue({ id: 2 });
    mockFindOne.mockResolvedValue({
      id: 9,
      portfolio_id: 2,
      name: 'KPIs',
      is_active: true,
    });

    let thrown: unknown;
    try {
      await service.createCategory({ portfolioId: 2, name: 'KPIs' });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = { url: '/api/control-lists/categories', method: 'POST' };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith({
      description: 'ConflictException',
      status: HttpStatus.CONFLICT,
      errors: {
        description: 'A category named "KPIs" already exists in this portfolio',
        field: 'name',
      },
      timestamp: expect.any(String),
      path: '/api/control-lists/categories',
    });
  });

  it('404 unknown portfolio: errors is the PLAIN STRING message (asymmetric with the 409 object shape)', async () => {
    mockPortfoliosFindOne.mockResolvedValue(null);

    let thrown: unknown;
    try {
      await service.createCategory({ portfolioId: 999, name: 'KPIs' });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeDefined();

    const request = { url: '/api/control-lists/categories', method: 'POST' };
    const { host, status, json } = makeHost(request);

    filter.catch(thrown, host as any);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({
      description: 'NotFoundException',
      status: HttpStatus.NOT_FOUND,
      errors: 'Portfolio 999 not found',
      timestamp: expect.any(String),
      path: '/api/control-lists/categories',
    });
  });
});
