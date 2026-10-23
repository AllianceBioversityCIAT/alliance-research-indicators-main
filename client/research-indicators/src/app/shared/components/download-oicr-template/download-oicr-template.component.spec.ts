import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DownloadOicrTemplateComponent } from './download-oicr-template.component';
import { CacheService } from '@shared/services/cache/cache.service';
import { ActionsService } from '@shared/services/actions.service';
import { OicrDownloadService } from '@shared/services/oicr-download.service';
import { ApiService } from '@shared/services/api.service';

describe('DownloadOicrTemplateComponent', () => {
  let fixture: ComponentFixture<DownloadOicrTemplateComponent>;
  let httpMock: HttpTestingController;
  let showToast: jest.Mock;

  beforeEach(async () => {
    showToast = jest.fn();

    await TestBed.configureTestingModule({
      imports: [DownloadOicrTemplateComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        OicrDownloadService,
        ApiService,
        { provide: ActionsService, useValue: { showToast } },
        {
          provide: CacheService,
          useValue: { getCurrentNumericResultId: () => 554 }
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
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();

    expect(showToast).toHaveBeenCalledTimes(1);
    expect(showToast).toHaveBeenCalledWith({
      severity: 'error',
      summary: 'Error',
      detail: 'Result is not an OICR'
    });
    expect(fixture.componentInstance.processing()).toBe(false);
    expect(fixture.nativeElement.querySelector('.pi-spinner')).toBeNull();
  });
});
