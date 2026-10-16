import { ArgumentMetadata, ValidationPipe } from '@nestjs/common';
import { GlobalExceptions } from '../../shared/error-management/global.exception';
import { LoggerUtil } from '../../shared/utils/logger.util';
import { OrgStructureReadService } from './org-structure-read.service';
import { GetYearViewQueryDto } from './dto/get-year-view-query.dto';

/**
 * The real wire contract of the read half (KZ-017): what the CLIENT receives
 * depends on what `GlobalExceptions` does with the exception the service
 * throws, and the integration harness does not mount it. The REAL read service
 * (repositories mocked) throws, the REAL filter formats.
 */
describe('Organizational Structure — real GlobalExceptions contract (T-01)', () => {
  let filter: GlobalExceptions;
  let errorSpy: jest.SpyInstance;

  const unitRepo = {
    findYearViewRows: jest.fn().mockResolvedValue([]),
    findVersionStartBounds: jest.fn(),
    findOne: jest.fn(),
  };
  const service = new OrgStructureReadService(
    unitRepo as never,
    {} as never,
    { findStaffByUnitIds: jest.fn().mockResolvedValue([]) } as never,
    { currentYear: () => 2026 },
  );

  const run = async (action: () => Promise<unknown>) => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          url: '/api/organizational-structure/units?year=1999',
          method: 'GET',
        }),
      }),
    };
    try {
      await action();
    } catch (exception) {
      filter.catch(exception, host as never);
    }
    return { status, body: json.mock.calls[0]?.[0] };
  };

  beforeAll(() => {
    errorSpy = jest
      .spyOn(LoggerUtil.prototype, '_error')
      .mockImplementation(() => undefined);
    filter = new GlobalExceptions();
  });

  afterAll(() => errorSpy.mockRestore());

  it('B1 year out of range -> 400 whose errors name `year`', async () => {
    const { status, body } = await run(() => service.getYearView(1999));

    expect(status).toHaveBeenCalledWith(400);
    expect(body).toMatchObject({
      description: 'BadRequestException',
      status: 400,
      errors: {
        description: 'year must be between 2000 and 2036',
        field: 'year',
      },
    });
  });

  it('B5 unknown entry -> 404 with the plain string', async () => {
    unitRepo.findOne.mockResolvedValue(null);

    const { status, body } = await run(() => service.getUnitDetail(404));

    expect(status).toHaveBeenCalledWith(404);
    expect(body).toMatchObject({
      description: 'NotFoundException',
      status: 404,
      errors: 'Organizational unit 404 not found',
    });
  });

  describe('B1 query validation through a real ValidationPipe', () => {
    const pipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    });
    const meta: ArgumentMetadata = {
      type: 'query',
      metatype: GetYearViewQueryDto,
    };

    it('a stale `portfolioId` is rejected with a 400 (R-ORG-001)', async () => {
      const { status, body } = await run(() =>
        pipe.transform({ year: '2026', portfolioId: '1' }, meta),
      );
      expect(status).toHaveBeenCalledWith(400);
      expect(body.errors).toEqual(
        expect.arrayContaining([
          expect.stringContaining('property portfolioId should not exist'),
        ]),
      );
    });

    it('a non-numeric year is rejected with a 400', async () => {
      const { status } = await run(() => pipe.transform({ year: 'abc' }, meta));
      expect(status).toHaveBeenCalledWith(400);
    });

    it('year and includeEnded are normalized from query strings ("false" stays false)', async () => {
      const dto = (await pipe.transform(
        { year: '2027', includeEnded: 'false' },
        meta,
      )) as GetYearViewQueryDto;
      expect(dto.year).toBe(2027);
      expect(dto.includeEnded).toBe(false);

      const on = (await pipe.transform(
        { includeEnded: 'true' },
        meta,
      )) as GetYearViewQueryDto;
      expect(on.includeEnded).toBe(true);
      expect(on.year).toBeUndefined();
    });

    it('omitting everything yields the defaults (includeEnded false, year undefined)', async () => {
      const dto = (await pipe.transform({}, meta)) as GetYearViewQueryDto;
      expect(dto.includeEnded).toBe(false);
      expect(dto.year).toBeUndefined();
    });
  });
});
