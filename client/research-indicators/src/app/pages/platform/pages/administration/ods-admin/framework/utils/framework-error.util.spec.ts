import { frameworkErrorOf } from './framework-error.util';

// @akili-spec institutional-performance/strategy-framework T-12 — design §2.1.
// Three shapes the envelope can put on `errors`: the domain object, a string,
// and Nest's DTO-validation string array. The HTTP body (description = exception
// name, errors = payload) is the shape `MainResponse.errorDetail` actually has.

describe('frameworkErrorOf', () => {
  it('returns the description of the domain object, including one that carries blockers', () => {
    expect(frameworkErrorOf({ description: 'code is taken', field: 'code' })).toBe('code is taken');
    expect(
      frameworkErrorOf({
        description: 'Delete is blocked',
        blockers: [{ reason: '1 institutional objective', count: 1, wayOut: 'Unlink it from that institutional objective first.' }]
      })
    ).toBe('Delete is blocked');
  });

  it('returns a plain string', () => {
    expect(frameworkErrorOf('Portfolio not found')).toBe('Portfolio not found');
  });

  it("joins Nest's string array into one message", () => {
    expect(frameworkErrorOf(['name should not be empty', 'code must be shorter than or equal to 30 characters'])).toBe(
      'name should not be empty code must be shorter than or equal to 30 characters'
    );
  });

  it('reads those three shapes from the envelope errors field, not the exception name', () => {
    expect(
      frameworkErrorOf({
        description: 'BadRequestException',
        status: 400,
        errors: { description: 'a portfolio holds at most 500 elements', field: 'portfolioId' }
      })
    ).toBe('a portfolio holds at most 500 elements');
    expect(frameworkErrorOf({ description: 'ForbiddenException', status: 403, errors: 'Forbidden' })).toBe('Forbidden');
    expect(frameworkErrorOf({ description: 'BadRequestException', status: 400, errors: ['portfolioId must be an integer'] })).toBe(
      'portfolioId must be an integer'
    );
  });

  it('falls back when the detail is empty or missing', () => {
    expect(frameworkErrorOf(undefined)).toBe('The framework could not be loaded. Please try again.');
    expect(frameworkErrorOf('   ')).toBe('The framework could not be loaded. Please try again.');
    expect(frameworkErrorOf([])).toBe('The framework could not be loaded. Please try again.');
  });
});
