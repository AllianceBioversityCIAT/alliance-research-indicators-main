import { ComponentFixture, TestBed } from '@angular/core/testing';
import { convertToParamMap, ActivatedRoute } from '@angular/router';
import { DomSanitizer } from '@angular/platform-browser';
import { ApiService } from '@shared/services/api.service';
import StarReportViewerComponent from './star-report-viewer.component';

describe('StarReportViewerComponent', () => {
  let fixture: ComponentFixture<StarReportViewerComponent>;
  let component: StarReportViewerComponent;
  let api: { GET_ResultPdfReport: jest.Mock; GET_Metadata: jest.Mock };

  const setup = async (
    id: string | null = 'STAR-8',
    version: string | null = '2026',
    options?: {
      pdfResponse?: { data: string };
      indicatorId?: number;
      metadataStatus?: number;
      metadataData?: unknown;
      emptyMetadataData?: boolean;
    }
  ) => {
    api = {
      GET_Metadata: jest.fn().mockResolvedValue({
        status: options?.metadataStatus ?? 200,
        data: options?.emptyMetadataData ? null : (options?.metadataData ?? { indicator_id: options?.indicatorId ?? 1 })
      }),
      GET_ResultPdfReport: jest.fn().mockResolvedValue(options?.pdfResponse ?? { data: 'https://reports.example.com/star-8.pdf' })
    };

    await TestBed.configureTestingModule({
      imports: [StarReportViewerComponent],
      providers: [
        { provide: ApiService, useValue: api },
        {
          provide: DomSanitizer,
          useValue: {
            bypassSecurityTrustResourceUrl: jest.fn((url: string) => url)
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap(id === null ? {} : { id }),
              queryParamMap: convertToParamMap(version === null ? {} : { version })
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StarReportViewerComponent);
    component = fixture.componentInstance;
    await (component as any).loadPdf();
  };

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('should load metadata and request the PDF using report_name derived from indicator_id', async () => {
    await setup();

    expect(api.GET_Metadata).toHaveBeenCalledWith(8, 'STAR');
    expect(api.GET_ResultPdfReport).toHaveBeenCalledWith('8', 'STAR', '2026', 'cap_sharing');
    expect(component.resultCode).toBe('STAR-8');
    expect(component.version).toBe('2026');
    expect(component.loading()).toBe(false);
    expect(component.safePdfUrl()).toBeTruthy();
  });

  it('should show an error when the report URL is empty', async () => {
    await setup('STAR-8', '2026', { pdfResponse: { data: '' } });

    expect(component.safePdfUrl()).toBeNull();
    expect(component.errorMessage()).toBe('The STAR PDF report is not available yet.');
  });

  it('should show an error when the route result code is invalid', async () => {
    await setup('   ', '2026');

    expect(api.GET_Metadata).not.toHaveBeenCalled();
    expect(api.GET_ResultPdfReport).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('The STAR result code is missing or invalid.');
  });

  it('should default missing route params to empty strings', async () => {
    await setup(null, null);

    expect(component.resultCode).toBe('');
    expect(component.version).toBe('');
  });

  it('should use the raw result code when it is not prefixed with STAR', async () => {
    await setup('8', '2026');

    expect(api.GET_Metadata).toHaveBeenCalledWith(8, 'STAR');
    expect(api.GET_ResultPdfReport).toHaveBeenCalledWith('8', 'STAR', '2026', 'cap_sharing');
  });

  it('should omit reportYear when the version query param is missing', async () => {
    await setup('STAR-8', null);

    expect(api.GET_ResultPdfReport).toHaveBeenCalledWith('8', 'STAR', null, 'cap_sharing');
  });

  it('should show coming soon when inn_dev PDF is temporarily disabled', async () => {
    await setup('STAR-8', '2026', { indicatorId: 2 });

    expect(api.GET_ResultPdfReport).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('Coming soon');
    expect(component.loading()).toBe(false);
  });

  it('should show an error when metadata cannot be loaded', async () => {
    await setup('STAR-8', '2026', { metadataStatus: 404, metadataData: undefined });

    expect(api.GET_ResultPdfReport).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('We could not load the result metadata. Please try again.');
  });

  it('should show an error when indicator does not support STAR PDF reports', async () => {
    await setup('STAR-8', '2026', { indicatorId: 5 });

    expect(api.GET_ResultPdfReport).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('PDF report is not available for this indicator.');
  });

  it('should invoke loadPdf from ngOnInit', async () => {
    api = {
      GET_Metadata: jest.fn().mockResolvedValue({ status: 200, data: { indicator_id: 1 } }),
      GET_ResultPdfReport: jest.fn().mockResolvedValue({ data: 'https://reports.example.com/star-8.pdf' })
    };

    await TestBed.configureTestingModule({
      imports: [StarReportViewerComponent],
      providers: [
        { provide: ApiService, useValue: api },
        {
          provide: DomSanitizer,
          useValue: {
            bypassSecurityTrustResourceUrl: jest.fn((url: string) => url)
          }
        },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'STAR-8' }),
              queryParamMap: convertToParamMap({ version: '2026' })
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StarReportViewerComponent);
    component = fixture.componentInstance;
    const loadPdfSpy = jest.spyOn(component as any, 'loadPdf').mockResolvedValue(undefined);

    component.ngOnInit();
    await fixture.whenStable();

    expect(loadPdfSpy).toHaveBeenCalled();
    loadPdfSpy.mockRestore();
  });

  it('should reject invalid numeric result codes', async () => {
    await setup('STAR-abc', '2026');

    expect(api.GET_Metadata).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('The STAR result code is missing or invalid.');
  });

  it('should reject zero as numeric result code', async () => {
    await setup('STAR-0', '2026');

    expect(api.GET_Metadata).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('The STAR result code is missing or invalid.');
  });

  it('should reject STAR prefix without official code', async () => {
    await setup('STAR-', '2026');

    expect(api.GET_Metadata).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('The STAR result code is missing or invalid.');
  });

  it('should omit reportYear when version is blank whitespace', async () => {
    await setup('STAR-8', '   ');

    expect(api.GET_ResultPdfReport).toHaveBeenCalledWith('8', 'STAR', null, 'cap_sharing');
  });

  it('should show an error when metadata response has no data on success status', async () => {
    await setup('STAR-8', '2026', { emptyMetadataData: true });

    expect(api.GET_ResultPdfReport).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('We could not load the result metadata. Please try again.');
  });

  it('should reject non-hyphen numeric zero result code', async () => {
    await setup('0', '2026');

    expect(api.GET_Metadata).not.toHaveBeenCalled();
    expect(component.errorMessage()).toBe('The STAR result code is missing or invalid.');
  });

  it('should show an error when generating the PDF fails', async () => {
    await setup('STAR-8', '2026');
    api.GET_ResultPdfReport.mockRejectedValueOnce(new Error('fail'));

    await (component as any).loadPdf();

    expect(component.loading()).toBe(false);
    expect(component.errorMessage()).toBe('We could not generate the STAR PDF report. Please try again.');
  });
});
