import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ControlListValueLookupService } from './control-list-value-lookup.service';
import { ControlListRepository } from './repositories/control-list.repository';
import { ControlListValueRepository } from './repositories/control-list-value.repository';
import { ControlList } from './entities/control-list.entity';
import { ControlListValue } from './entities/control-list-value.entity';

/**
 * T-04 (docs/specs/institutional-performance/control-lists) — design.md §5
 * rule 10 / D-CTL-15, R-CTL-006 "List membership" + "Value from another
 * list" scenario.
 */
describe('ControlListValueLookupService', () => {
  let service: ControlListValueLookupService;

  const mockListFindOne = jest.fn();
  const mockValueFindOne = jest.fn();

  const buildList = (overrides: Partial<ControlList> = {}): ControlList =>
    ({
      id: 3,
      portfolio_id: 2,
      list_key: 'kpi.direction',
      ...overrides,
    }) as ControlList;

  const buildValue = (
    overrides: Partial<ControlListValue> = {},
  ): ControlListValue =>
    ({
      id: 1,
      list_id: 3,
      code: 'DIR-01',
      value: 'Increase',
      is_active: true,
      ...overrides,
    }) as ControlListValue;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ControlListValueLookupService,
        {
          provide: ControlListRepository,
          useValue: { findOne: mockListFindOne },
        },
        {
          provide: ControlListValueRepository,
          useValue: { findOne: mockValueFindOne },
        },
      ],
    }).compile();

    service = module.get<ControlListValueLookupService>(
      ControlListValueLookupService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // P-10 guard: this service's own constructor params are both
  // repositories, never `CurrentUserUtil` (`current-user.util.ts:7`,
  // `Scope.REQUEST`) — so it (and a consumer that injects it) stays a
  // singleton.
  it('has no request-scoped dependency in its constructor (P-10 guard)', () => {
    const paramTypes: { name?: string }[] =
      Reflect.getMetadata('design:paramtypes', ControlListValueLookupService) ??
      [];

    expect(paramTypes.map((type) => type?.name)).toEqual([
      'ControlListRepository',
      'ControlListValueRepository',
    ]);
  });

  it('throws NotFoundException for an unknown value id', async () => {
    mockValueFindOne.mockResolvedValue(null);

    await expect(
      service.assertValueInList(999, 2, 'kpi.direction'),
    ).rejects.toThrow(NotFoundException);
    expect(mockListFindOne).not.toHaveBeenCalled();
  });

  it('returns the value when the key AND the portfolio match', async () => {
    mockValueFindOne.mockResolvedValue(buildValue({ id: 1, list_id: 3 }));
    mockListFindOne.mockResolvedValue(
      buildList({ id: 3, portfolio_id: 2, list_key: 'kpi.direction' }),
    );

    const result = await service.assertValueInList(1, 2, 'kpi.direction');

    expect(result.id).toBe(1);
    expect(mockValueFindOne).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(mockListFindOne).toHaveBeenCalledWith({ where: { id: 3 } });
  });

  // Falsifier 3 (tasks.md T-04) / R-CTL-006 "Value from another list": a
  // value of `kpi.direction` checked against `kpi.unit_of_measure` for the
  // SAME portfolio must 400 naming the expected key, not pass because the
  // portfolio matched.
  it('throws BadRequestException naming the expected key for a value of another list in the SAME portfolio', async () => {
    mockValueFindOne.mockResolvedValue(buildValue({ id: 1, list_id: 3 }));
    mockListFindOne.mockResolvedValue(
      buildList({ id: 3, portfolio_id: 2, list_key: 'kpi.direction' }),
    );

    await expect(
      service.assertValueInList(1, 2, 'kpi.unit_of_measure'),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.assertValueInList(1, 2, 'kpi.unit_of_measure'),
    ).rejects.toThrow(/kpi\.direction/);
  });

  // Falsifier 4 (tasks.md T-04): a value of the RIGHT key in ANOTHER
  // portfolio must 400, not pass because the key matched.
  it('throws BadRequestException for a value of the right key in ANOTHER portfolio', async () => {
    mockValueFindOne.mockResolvedValue(buildValue({ id: 1, list_id: 3 }));
    mockListFindOne.mockResolvedValue(
      buildList({ id: 3, portfolio_id: 2, list_key: 'kpi.direction' }),
    );

    await expect(
      service.assertValueInList(1, 1, 'kpi.direction'),
    ).rejects.toThrow(BadRequestException);
  });

  // design §5 rule 10: "does NOT check is_active" — a deactivated value
  // still resolves (R-CTL-004 "Deactivate": a record that already
  // references it must stay saveable).
  it('does not check is_active — a deactivated value still resolves', async () => {
    mockValueFindOne.mockResolvedValue(
      buildValue({ id: 1, list_id: 3, is_active: false }),
    );
    mockListFindOne.mockResolvedValue(
      buildList({ id: 3, portfolio_id: 2, list_key: 'kpi.direction' }),
    );

    const result = await service.assertValueInList(1, 2, 'kpi.direction');

    expect(result.id).toBe(1);
    // The query by id carries no is_active filter at all.
    expect(mockValueFindOne).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('throws NotFoundException when the value references a list row that no longer exists', async () => {
    mockValueFindOne.mockResolvedValue(buildValue({ id: 1, list_id: 999 }));
    mockListFindOne.mockResolvedValue(null);

    await expect(
      service.assertValueInList(1, 2, 'kpi.direction'),
    ).rejects.toThrow(NotFoundException);
  });
});
