import { TestBed } from '@angular/core/testing';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';
import { DATE_FORMAT_CONFIG_FIXTURE, provideDateFormatConfigMock } from './date-format-config.mock';

describe('date-format-config.mock', () => {
  it('provides the fixture config by default and loadConfig resolves it', async () => {
    TestBed.configureTestingModule({ providers: [provideDateFormatConfigMock()] });
    const svc = TestBed.inject(DateFormatConfigService);
    expect(svc.config()).toBe(DATE_FORMAT_CONFIG_FIXTURE);
    await expect(svc.loadConfig()).resolves.toBe(DATE_FORMAT_CONFIG_FIXTURE);
  });

  it('accepts a null config', async () => {
    TestBed.configureTestingModule({ providers: [provideDateFormatConfigMock(null)] });
    const svc = TestBed.inject(DateFormatConfigService);
    expect(svc.config()).toBeNull();
    await expect(svc.loadConfig()).resolves.toBeNull();
  });
});
