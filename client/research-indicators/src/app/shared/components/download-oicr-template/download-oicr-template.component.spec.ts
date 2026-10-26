import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DownloadOicrTemplateComponent } from './download-oicr-template.component';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { OicrDownloadService } from '@shared/services/oicr-download.service';
import { OicrLegacyDownloadService } from '@shared/services/oicr-legacy-download.service';
import { ApiService } from '@shared/services/api.service';
import { WasmService } from '@shared/services/go/wasm.service';

describe('DownloadOicrTemplateComponent', () => {
  let fixture: ComponentFixture<DownloadOicrTemplateComponent>;
  let httpMock: HttpTestingController;
  let showToast: jest.Mock;
  let metadata: { portfolio?: { id?: number } };
  let loadWasm: jest.SpyInstance;
  let legacyMock: { generateAndDownload: jest.Mock };

  beforeEach(async () => {
    showToast = jest.fn();
    metadata = { portfolio: { id: 2 } };
    legacyMock = { generateAndDownload: jest.fn() };
    loadWasm = jest.spyOn(WasmService.prototype, 'loadWasm').mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [DownloadOicrTemplateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OicrDownloadService,
        ApiService,
        { provide: OicrLegacyDownloadService, useValue: legacyMock },
        { provide: ActionsService, useValue: { showToast } },
        {
          provide: CacheService,
          useValue: {
            getCurrentNumericResultId: () => 554,
            currentMetadata: () => metadata
          }
        }
      ]
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DownloadOicrTemplateComponent);
    fixture.componentInstance.onlyIcon = true;
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    loadWasm.mockRestore();
  });

  it('a Portfolio 2 render and click never calls WasmService.loadWasm', async () => {
    expect(loadWasm).not.toHaveBeenCalled();

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();

    const request = httpMock.expectOne(req => req.url.includes('results/oicr/word-template/554'));
    request.flush(new Blob(['PK']), { status: 200, statusText: 'OK' });

    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(loadWasm).not.toHaveBeenCalled();
  });

  it('goes idle, then loading, then one error toast', async () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.pi-spinner')).toBeNull();
    expect(showToast).not.toHaveBeenCalled();

    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.processing()).toBe(true);
    expect(fixture.nativeElement.querySelector('.pi-spinner')).toBeTruthy();

    const request = httpMock.expectOne(req => req.url.includes('results/oicr/word-template/554'));
    expect(request.request.headers.has('X-Use-Year')).toBe(false);
    request.flush(new Blob([JSON.stringify({ errors: 'Result is not an OICR', description: 'BadRequestException' })]), {
      status: 400,
      statusText: 'Bad Request'
    });

    await fixture.whenStable();
    // FileReader reports the error Blob on a later task than setTimeout(0).
    for (let attempt = 0; attempt < 20 && showToast.mock.calls.length === 0; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    fixture.detectChanges();

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Result is not an OICR'
    });
    expect(fixture.componentInstance.processing()).toBe(false);
    expect(fixture.nativeElement.querySelector('.pi-spinner')).toBeNull();
    expect(loadWasm).not.toHaveBeenCalled();
  });

  it('a Portfolio 1 click calls the legacy path', async () => {
    metadata = { portfolio: { id: 1 } };
    legacyMock.generateAndDownload.mockResolvedValue({ success: true });

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(legacyMock.generateAndDownload).toHaveBeenCalledTimes(1);
    expect(legacyMock.generateAndDownload).toHaveBeenCalledWith(554);
    httpMock.expectNone(req => req.url.includes('results/oicr/word-template'));
    expect(showToast).not.toHaveBeenCalled();
    expect(loadWasm).not.toHaveBeenCalled();
  });

  it('a legacy failure shows exactly one toast', async () => {
    metadata = { portfolio: { id: 1 } };
    legacyMock.generateAndDownload.mockResolvedValue({ success: false, error: 'Failed to load WASM. Please try again.' });

    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.click();
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Failed to load WASM. Please try again.'
    });
    httpMock.expectNone(req => req.url.includes('results/oicr/word-template'));
  });
});
