import { GlobalExceptions } from '../../shared/error-management/global.exception';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { badRequest, blocked } from './framework-errors';

/**
 * Wire shape of a domain 400 and a domain 409 (design §4 last paragraph,
 * testing strategy). `framework-errors` builds `{ message: { description,
 * field | blockers } }`; the real `GlobalExceptions` copies that object into
 * `errors`.
 *
 * What this cannot reach (KZ-017): which service method throws. The filter
 * never sees a repository, SQL, or an HTTP stack. Service specs own the
 * throw sites; T-10 owns the booted route.
 */
describe('Strategy Framework — GlobalExceptions wire shape (T-08)', () => {
  let filter: GlobalExceptions;
  let errorSpy: jest.SpyInstance;

  const run = (exception: unknown) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          url: '/api/strategy-framework/elements/1',
          method: 'DELETE',
        }),
      }),
    };
    filter.catch(exception, host as never);
    return { status, body: json.mock.calls[0]?.[0] };
  };

  beforeAll(() => {
    errorSpy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
    filter = new GlobalExceptions();
  });

  afterAll(() => errorSpy.mockRestore());

  it('emits a 409 whose errors carry blockers', () => {
    const { status, body } = run(
      blocked(
        'Cannot delete Indicator 1.2.2: linked by 1 institutional objective.',
        [
          {
            reason: 'objectives',
            count: 1,
            wayOut: 'Unlink it from that institutional objective first.',
          },
        ],
      ),
    );

    expect(status).toHaveBeenCalledWith(409);
    expect(body).toMatchObject({
      description: 'ConflictException',
      status: 409,
      errors: {
        description:
          'Cannot delete Indicator 1.2.2: linked by 1 institutional objective.',
        blockers: [
          {
            reason: 'objectives',
            count: 1,
            wayOut: 'Unlink it from that institutional objective first.',
          },
        ],
      },
      path: '/api/strategy-framework/elements/1',
    });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.errors).not.toHaveProperty('field');
  });

  it('emits a 400 whose errors carry field', () => {
    const { status, body } = run(
      badRequest('parentId', 'an element never changes depth'),
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(body).toMatchObject({
      description: 'BadRequestException',
      status: 400,
      errors: {
        description: 'an element never changes depth',
        field: 'parentId',
      },
      path: '/api/strategy-framework/elements/1',
    });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.errors).not.toHaveProperty('blockers');
  });
});
