import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DomSanitizer } from '@angular/platform-browser';
import { ActionsService } from '@services/actions.service';
import { APPLICATION_CONFIGURATION_KEY } from '@shared/constants/application-configuration-keys';
import { ApiService } from '@shared/services/api.service';
import CapacityBulkUploadComponent from './capacity-bulk-upload.component';

describe('CapacityBulkUploadComponent', () => {
  let getConfigurationByKey: jest.Mock;
  let isTokenExpired: jest.Mock;
  let dataCache: jest.Mock;

  beforeEach(async () => {
    TestBed.resetTestingModule();
    getConfigurationByKey = jest.fn().mockResolvedValue({
      data: { simple_value: 'https://embed.example.com/', json_value: null }
    });
    isTokenExpired = jest.fn().mockResolvedValue({ isTokenExpired: false });
    dataCache = jest.fn().mockReturnValue({ access_token: 'jwt-token' });

    await TestBed.configureTestingModule({
      imports: [CapacityBulkUploadComponent],
      providers: [
        { provide: ApiService, useValue: { GET_ConfigurationByKey: getConfigurationByKey } },
        {
          provide: ActionsService,
          useValue: {
            isTokenExpired,
            cache: { dataCache }
          }
        }
      ]
    }).compileComponents();
  });

  async function createAndStabilize(): Promise<ComponentFixture<CapacityBulkUploadComponent>> {
    const fixture = TestBed.createComponent(CapacityBulkUploadComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  it('should create', async () => {
    const fixture = await createAndStabilize();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should request bulk upload configuration by key and token validation in parallel', async () => {
    await createAndStabilize();
    expect(getConfigurationByKey).toHaveBeenCalledWith(APPLICATION_CONFIGURATION_KEY.BULK_UPLOAD_EMBED_URL);
    expect(isTokenExpired).toHaveBeenCalled();
  });

  it('should set safe embed URL and clear loading on success', async () => {
    const sanitizer = TestBed.inject(DomSanitizer);
    const bypassSpy = jest.spyOn(sanitizer, 'bypassSecurityTrustResourceUrl');
    const fixture = await createAndStabilize();
    const comp = fixture.componentInstance;
    expect(comp.loading()).toBe(false);
    expect(comp.loadError()).toBe(false);
    expect(comp.missingUrl()).toBe(false);
    expect(comp.safeEmbedUrl()).toBeTruthy();
    expect(bypassSpy).toHaveBeenCalled();
    const iframe = fixture.nativeElement.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe.getAttribute('title')).toBe('Capacity Development bulk upload');
    bypassSpy.mockRestore();
  });

  it('should set missingUrl when embed URL is absent', async () => {
    getConfigurationByKey.mockResolvedValue({ data: { simple_value: null, json_value: null } });
    const fixture = await createAndStabilize();
    expect(fixture.componentInstance.missingUrl()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('no embed URL was returned');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
  });

  it('should set loadError when access token is missing', async () => {
    dataCache.mockReturnValue({ access_token: '' });
    const fixture = await createAndStabilize();
    expect(fixture.componentInstance.loadError()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('could not be loaded');
  });

  it('should set loadError when access token is whitespace only', async () => {
    dataCache.mockReturnValue({ access_token: '   ' });
    const fixture = await createAndStabilize();
    expect(fixture.componentInstance.loadError()).toBe(true);
  });

  it('should set loadError when configuration request fails', async () => {
    getConfigurationByKey.mockRejectedValue(new Error('network'));
    const fixture = await createAndStabilize();
    expect(fixture.componentInstance.loadError()).toBe(true);
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('could not be loaded');
  });

  it('should show loading state before async work completes', async () => {
    let resolveConfig!: (v: unknown) => void;
    const pending = new Promise(r => {
      resolveConfig = r;
    });
    getConfigurationByKey.mockReturnValue(pending);

    const fixture = TestBed.createComponent(CapacityBulkUploadComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(true);
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();

    resolveConfig!({ data: { simple_value: 'https://x.com/', json_value: null } });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.componentInstance.loading()).toBe(false);
    expect(fixture.nativeElement.querySelector('iframe')).toBeTruthy();
  });
});
