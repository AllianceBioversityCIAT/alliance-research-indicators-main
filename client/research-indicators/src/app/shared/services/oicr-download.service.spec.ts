import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { OicrDownloadService, OICR_WORD_TEMPLATE_GENERIC_ERROR, OICR_WORD_TEMPLATE_UNKNOWN_PORTFOLIO_ERROR } from './oicr-download.service';
import { OicrLegacyDownloadService } from './oicr-legacy-download.service';
import { ApiService } from './api.service';

describe('OicrDownloadService', () => {
  let service: OicrDownloadService;
  let apiMock: { GET_OicrWordTemplate: jest.Mock };
  let legacyMock: { generateAndDownload: jest.Mock };
  let downloadedNames: string[];

  beforeEach(() => {
    downloadedNames = [];
    apiMock = { GET_OicrWordTemplate: jest.fn() };
    legacyMock = { generateAndDownload: jest.fn() };

    const urlApi = globalThis.URL as unknown as { createObjectURL: jest.Mock; revokeObjectURL: jest.Mock };
    urlApi.createObjectURL = jest.fn().mockReturnValue('blob:oicr');
    urlApi.revokeObjectURL = jest.fn();
    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloadedNames.push(this.download);
    });

    TestBed.configureTestingModule({
      providers: [OicrDownloadService, { provide: ApiService, useValue: apiMock }, { provide: OicrLegacyDownloadService, useValue: legacyMock }]
    });

    service = TestBed.inject(OicrDownloadService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  function errorBlob(body: string, type = 'application/json'): HttpErrorResponse {
    return new HttpErrorResponse({
      error: new Blob([body], { type }),
      status: 400,
      statusText: 'Bad Request',
      url: 'https://example.test/api/results/oicr/word-template/554'
    });
  }

  it('saves the file as STAR_OICR_<code>_<yyyyMMdd>_<HHmm>.docx in local time', async () => {
    jest.useFakeTimers({
      now: new Date(2026, 9, 23, 14, 5, 30),
      doNotFake: ['nextTick', 'queueMicrotask', 'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval', 'setImmediate']
    });
    apiMock.GET_OicrWordTemplate.mockResolvedValue(new Blob(['PK']));

    await service.download(554, 2);

    expect(apiMock.GET_OicrWordTemplate).toHaveBeenCalledTimes(1);
    expect(apiMock.GET_OicrWordTemplate).toHaveBeenCalledWith(554);
    expect(legacyMock.generateAndDownload).not.toHaveBeenCalled();
    expect(downloadedNames).toEqual(['STAR_OICR_554_20261023_1405.docx']);
  });

  it('prefers errors over description', async () => {
    apiMock.GET_OicrWordTemplate.mockRejectedValue(
      errorBlob(JSON.stringify({ errors: 'Result is not an OICR', description: 'BadRequestException' }))
    );

    await expect(service.download(554, 2)).rejects.toThrow('Result is not an OICR');
    expect(downloadedNames).toEqual([]);
    expect(legacyMock.generateAndDownload).not.toHaveBeenCalled();
  });

  it('uses description when errors is absent', async () => {
    apiMock.GET_OicrWordTemplate.mockRejectedValue(
      errorBlob(JSON.stringify({ description: 'The OICR Word template applies to 2026 (Portfolio 2) OICRs only' }))
    );

    await expect(service.download(554, 2)).rejects.toThrow('The OICR Word template applies to 2026 (Portfolio 2) OICRs only');
  });

  it('uses the generic message when the body is HTML', async () => {
    apiMock.GET_OicrWordTemplate.mockRejectedValue(errorBlob('<html><body>Bad Gateway</body></html>', 'text/html'));

    await expect(service.download(554, 2)).rejects.toThrow(OICR_WORD_TEMPLATE_GENERIC_ERROR);
  });

  it('portfolio 1 calls the legacy service and not the server', async () => {
    legacyMock.generateAndDownload.mockResolvedValue({ success: true });

    await service.download(554, 1);

    expect(legacyMock.generateAndDownload).toHaveBeenCalledTimes(1);
    expect(legacyMock.generateAndDownload).toHaveBeenCalledWith(554);
    expect(apiMock.GET_OicrWordTemplate).not.toHaveBeenCalled();
  });

  it('portfolio 2 uses the server path and not the legacy service', async () => {
    apiMock.GET_OicrWordTemplate.mockResolvedValue(new Blob(['PK']));

    await service.download(554, 2);

    expect(apiMock.GET_OicrWordTemplate).toHaveBeenCalledWith(554);
    expect(legacyMock.generateAndDownload).not.toHaveBeenCalled();
  });

  it.each([undefined, 3])('portfolio %s rejects and calls neither path', async portfolioId => {
    await expect(service.download(554, portfolioId)).rejects.toThrow(OICR_WORD_TEMPLATE_UNKNOWN_PORTFOLIO_ERROR);
    expect(legacyMock.generateAndDownload).not.toHaveBeenCalled();
    expect(apiMock.GET_OicrWordTemplate).not.toHaveBeenCalled();
  });

  it('rejects with the legacy error text when success is false', async () => {
    legacyMock.generateAndDownload.mockResolvedValue({ success: false, error: 'X' });

    await expect(service.download(554, 1)).rejects.toThrow('X');
    expect(apiMock.GET_OicrWordTemplate).not.toHaveBeenCalled();
  });
});
