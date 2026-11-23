import { Logger, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Observable, of, throwError } from 'rxjs';
import { DataSource } from 'typeorm';
import { AppConfig } from '../../../shared/utils/app-config.util';
import { IndicatorsEnum } from '../../indicators/enum/indicators.enum';
import { ResultOicrRepository } from '../repositories/result-oicr.repository';
import { OicrWordTemplateData } from './dto/oicr-word-template-data.dto';
import {
  OicrWordTemplateMissingControlError,
  OicrWordTemplateMissingOptionError,
  OicrWordTemplateUnexpectedStructureError,
  build,
} from './oicr-word-template.engine';
import { OicrWordTemplateService } from './oicr-word-template.service';

jest.mock('./oicr-word-template.engine', () => {
  const actual = jest.requireActual<
    typeof import('./oicr-word-template.engine')
  >('./oicr-word-template.engine');
  return {
    ...actual,
    build: jest.fn(async () => Buffer.from('filled')),
  };
});

const RESULT_ID = 9;
const RESULT_CODE = 554;
const TEMPLATE_URL = 'https://files.example/a.docx';

const MODAL_DATA: OicrWordTemplateData = {
  reportingYear: '2026',
  title: 'A title',
  geoScopeId: null,
  geoComment: null,
  elaboration: null,
  tagId: null,
  previousHandle: null,
  mainProject: null,
  researchAreas: [],
  regions: [],
  countries: [],
  contact: null,
};

describe('OicrWordTemplateService', () => {
  let service: OicrWordTemplateService;
  let calls: string[];
  let httpGet: jest.Mock;
  let query: jest.Mock;
  let getWordTemplateData: jest.Mock;
  let templateUrl: string;
  let portfolioId: number | string | null;
  let warnSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  const buildMock = build as unknown as jest.Mock;

  beforeEach(() => {
    calls = [];
    templateUrl = TEMPLATE_URL;
    portfolioId = 2;
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});

    httpGet = jest.fn().mockImplementation(() => {
      calls.push('fetch');
      return of({ status: 200, data: Buffer.from('template-bytes') });
    });
    query = jest.fn().mockImplementation(async () => {
      calls.push('portfolio');
      return [{ portfolio_id: portfolioId }];
    });
    getWordTemplateData = jest.fn().mockImplementation(async () => {
      calls.push('data');
      return MODAL_DATA;
    });
    buildMock.mockClear();
    buildMock.mockImplementation(async () => Buffer.from('filled'));

    service = new OicrWordTemplateService(
      { get: httpGet } as unknown as HttpService,
      {
        get ARI_OICR_TEMPLATE_URL() {
          return templateUrl;
        },
      } as AppConfig,
      { query } as unknown as DataSource,
      {
        getWordTemplateData,
      } as unknown as ResultOicrRepository,
    );
  });

  afterEach(() => {
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('fetches only after portfolio and data, and does not cache the template or the URL', async () => {
    const first = await service.download(
      RESULT_ID,
      IndicatorsEnum.OICR,
      RESULT_CODE,
    );
    templateUrl = 'https://files.example/b.docx';
    const second = await service.download(
      RESULT_ID,
      IndicatorsEnum.OICR,
      RESULT_CODE,
    );

    expect(first).toEqual(Buffer.from('filled'));
    expect(second).toEqual(Buffer.from('filled'));
    expect(calls).toEqual([
      'portfolio',
      'data',
      'fetch',
      'portfolio',
      'data',
      'fetch',
    ]);
    expect(httpGet).toHaveBeenCalledTimes(2);
    expect(httpGet).toHaveBeenNthCalledWith(
      1,
      TEMPLATE_URL,
      expect.objectContaining({
        timeout: 10_000,
        responseType: 'arraybuffer',
      }),
    );
    expect(httpGet).toHaveBeenNthCalledWith(
      2,
      'https://files.example/b.docx',
      expect.objectContaining({ timeout: 10_000 }),
    );
    expect(query).toHaveBeenCalledWith(
      'SELECT get_portfolio_id_by_result(?) AS portfolio_id',
      [RESULT_ID],
    );
    expect(buildMock).toHaveBeenCalledWith(
      Buffer.from('template-bytes'),
      expect.any(Object),
    );
    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('not an OICR → 400 and no HttpService call', async () => {
    await expect(
      service.download(RESULT_ID, IndicatorsEnum.POLICY_CHANGE, RESULT_CODE),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      message: 'Result is not an OICR',
    });

    expect(httpGet).not.toHaveBeenCalled();
    expect(calls).toEqual([]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`result_code=${RESULT_CODE} reason=not_an_oicr`),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('P1 → no HttpService call', async () => {
    portfolioId = 1;

    await expect(
      service.download(RESULT_ID, IndicatorsEnum.OICR, RESULT_CODE),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      message:
        'The OICR Word template applies to 2026 (Portfolio 2) OICRs only',
    });

    expect(httpGet).not.toHaveBeenCalled();
    expect(calls).toEqual(['portfolio']);
    expect(getWordTemplateData).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining(`result_code=${RESULT_CODE} reason=portfolio_1`),
    );
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('empty URL → 500 and no HttpService call', async () => {
    templateUrl = '   ';

    await expect(
      service.download(RESULT_ID, IndicatorsEnum.OICR, RESULT_CODE),
    ).rejects.toMatchObject({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'OICR template URL is not configured',
    });

    expect(httpGet).not.toHaveBeenCalled();
    expect(calls).toEqual(['portfolio']);
    expect(getWordTemplateData).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `result_code=${RESULT_CODE} reason=template_url_missing`,
      ),
    );
  });

  it('non-200 → 502', async () => {
    httpGet.mockImplementation(() => {
      calls.push('fetch');
      return throwError(() => ({ response: { status: 503 } }));
    });

    await expect(
      service.download(RESULT_ID, IndicatorsEnum.OICR, RESULT_CODE),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_GATEWAY,
      message: 'Could not fetch the OICR template (503)',
    });

    expect(calls).toEqual(['portfolio', 'data', 'fetch']);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining(`result_code=${RESULT_CODE} upstream_status=503`),
    );
  });

  it('timeout → 502', async () => {
    jest.useFakeTimers();
    try {
      httpGet.mockImplementation(() => {
        calls.push('fetch');
        return new Observable(() => undefined);
      });

      const pending = service.download(
        RESULT_ID,
        IndicatorsEnum.OICR,
        RESULT_CODE,
      );
      const assertion = expect(pending).rejects.toMatchObject({
        status: HttpStatus.BAD_GATEWAY,
        message: 'Could not fetch the OICR template (timeout)',
      });
      await jest.advanceTimersByTimeAsync(10_000);
      await assertion;

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`result_code=${RESULT_CODE} timeout`),
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it.each([
    {
      label: 'missing control',
      error: new OicrWordTemplateMissingControlError('title', '111'),
      message: 'OICR template is missing control title (111)',
      log: 'control=title:111',
    },
    {
      label: 'unexpected structure',
      error: new OicrWordTemplateUnexpectedStructureError(
        'geoScope',
        '222',
        'two items',
      ),
      message:
        'OICR template control geoScope has an unexpected structure (two items)',
      log: 'control=geoScope:222',
    },
    {
      label: 'missing option',
      error: new OicrWordTemplateMissingOptionError('tag', '333', 'New OICR'),
      message: 'OICR template control tag has no option "New OICR"',
      log: 'control=tag:333',
    },
  ])(
    'engine named error ($label) → 500 carrying the control name',
    async ({ error, message, log }) => {
      buildMock.mockRejectedValueOnce(error);

      await expect(
        service.download(RESULT_ID, IndicatorsEnum.OICR, RESULT_CODE),
      ).rejects.toMatchObject({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message,
      });

      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining(`result_code=${RESULT_CODE} ${log}`),
      );
    },
  );
});
