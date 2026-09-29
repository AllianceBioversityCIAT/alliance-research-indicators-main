import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';
import { DEFAULT_OICR_REPORTING_YEAR, OicrReportingYearService } from './oicr-reporting-year.service';

describe('OicrReportingYearService', () => {
  let service: OicrReportingYearService;
  let api: { GET_ConfigurationByKey: jest.Mock };

  beforeEach(() => {
    api = { GET_ConfigurationByKey: jest.fn() };
    TestBed.configureTestingModule({
      providers: [OicrReportingYearService, { provide: ApiService, useValue: api }]
    });
    service = TestBed.inject(OicrReportingYearService);
  });

  it('starts at the default year before the configuration resolves', () => {
    expect(service.year()).toBe(DEFAULT_OICR_REPORTING_YEAR);
  });

  it('reads OICR.REPORTING_YEAR and exposes it', async () => {
    api.GET_ConfigurationByKey.mockResolvedValue({ data: { simple_value: ' 2027 ' } });

    await expect(service.load()).resolves.toBe(2027);

    expect(api.GET_ConfigurationByKey).toHaveBeenCalledWith('OICR.REPORTING_YEAR');
    expect(service.year()).toBe(2027);
  });

  it.each([null, '', 'next year', '2026.5'])('falls back to the default for an unusable value (%p)', async value => {
    api.GET_ConfigurationByKey.mockResolvedValue({ data: { simple_value: value } });

    await service.load();

    expect(service.year()).toBe(DEFAULT_OICR_REPORTING_YEAR);
  });

  it('falls back to the default when the request fails', async () => {
    api.GET_ConfigurationByKey.mockRejectedValue(new Error('network'));

    await expect(service.load()).resolves.toBe(DEFAULT_OICR_REPORTING_YEAR);
  });

  it('requests the configuration only once per session', async () => {
    api.GET_ConfigurationByKey.mockResolvedValue({ data: { simple_value: '2026' } });

    await Promise.all([service.load(), service.load()]);

    expect(api.GET_ConfigurationByKey).toHaveBeenCalledTimes(1);
  });
});
