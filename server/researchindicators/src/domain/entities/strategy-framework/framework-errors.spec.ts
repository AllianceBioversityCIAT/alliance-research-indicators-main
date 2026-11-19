import {
  badRequest,
  blocked,
  childrenWayOut,
  conflict,
  consumerWayOut,
  institutionalObjectivesWayOut,
} from './framework-errors';

describe('framework-errors (design 2.1, R-STF-006, design 5.4 step 2)', () => {
  it('badRequest builds { message: { description, field } }', () => {
    const error = badRequest(
      'code',
      'parent code too long to extend; type a code',
    );
    expect(error.getStatus()).toBe(400);
    expect(error.getResponse()).toEqual({
      message: {
        description: 'parent code too long to extend; type a code',
        field: 'code',
      },
    });
  });

  it('conflict builds { message: { description, field } } and omits field when absent', () => {
    const named = conflict('Code 1.3 is already used', 'code');
    expect(named.getStatus()).toBe(409);
    expect(named.getResponse()).toEqual({
      message: { description: 'Code 1.3 is already used', field: 'code' },
    });

    const plain = conflict('the framework changed, reload');
    expect(plain.getStatus()).toBe(409);
    expect(plain.getResponse()).toEqual({
      message: { description: 'the framework changed, reload' },
    });

    const emptyField = conflict('the framework changed, reload', '');
    expect(emptyField.getResponse()).toEqual({
      message: { description: 'the framework changed, reload', field: '' },
    });
  });

  it.each([
    ['children', 1, 'Delete or move its 1 Indicator first.'],
    ['children', 2, 'Delete or move its 2 Indicators first.'],
    [
      'institutional-objective',
      1,
      'Unlink it from that institutional objective first.',
    ],
    [
      'institutional-objective',
      2,
      'Unlink it from those 2 institutional objectives first.',
    ],
    ['consumer', 1, 'Remove its 1 record in KPIs first.'],
    ['consumer', 2, 'Remove its 2 records in KPIs first.'],
  ])('way-out %s when N = %s', (kind, count, expected) => {
    const wayOut =
      kind === 'children'
        ? childrenWayOut(count, 'Indicator', 'Indicators')
        : kind === 'institutional-objective'
          ? institutionalObjectivesWayOut(count)
          : consumerWayOut(count, 'KPIs');
    expect(wayOut).toBe(expected);
  });

  it('blocked builds { message: { description, blockers } } with a way out per blocker', () => {
    const blockers = [
      {
        reason: 'children',
        count: 2,
        wayOut: childrenWayOut(2, 'Indicator', 'Indicators'),
      },
      {
        reason: 'institutional-objective',
        count: 1,
        wayOut: institutionalObjectivesWayOut(1),
      },
      {
        reason: 'consumer',
        count: 4,
        wayOut: consumerWayOut(4, 'KPIs'),
      },
    ];
    expect(blockers.map((blocker) => blocker.wayOut)).toEqual([
      'Delete or move its 2 Indicators first.',
      'Unlink it from that institutional objective first.',
      'Remove its 4 records in KPIs first.',
    ]);

    const error = blocked(
      'Cannot delete Indicator 1.2.2: linked by 1 institutional objective. Unlink it from that objective first.',
      blockers,
    );
    expect(error.getStatus()).toBe(409);
    expect(error.getResponse()).toEqual({
      message: {
        description:
          'Cannot delete Indicator 1.2.2: linked by 1 institutional objective. Unlink it from that objective first.',
        blockers,
      },
    });
  });
});
