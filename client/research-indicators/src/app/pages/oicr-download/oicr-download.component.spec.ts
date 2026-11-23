import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import OicrDownloadComponent, { OICR_DOWNLOAD_PAGE_PORTFOLIO_ERROR } from './oicr-download.component';
import { OicrDownloadService } from '@shared/services/oicr-download.service';
import { ApiService } from '@shared/services/api.service';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';

describe('OicrDownloadComponent', () => {
  let component: OicrDownloadComponent;
  let fixture: ComponentFixture<OicrDownloadComponent>;
  let oicrDownloadServiceMock: { download: jest.Mock };
  let apiMock: { GET_Metadata: jest.Mock };
  let routerMock: jest.Mocked<Router>;
  let routeMock: { snapshot: { paramMap: ReturnType<typeof convertToParamMap>; queryParamMap: ReturnType<typeof convertToParamMap> } };

  const setRoute = (pathCode?: string, queryCode?: string) => {
    routeMock.snapshot = {
      paramMap: convertToParamMap(pathCode ? { resultCode: pathCode } : {}),
      queryParamMap: convertToParamMap(queryCode ? { resultCode: queryCode } : {})
    };
  };

  const settle = async () => {
    await fixture.whenStable();
    await new Promise(resolve => setTimeout(resolve, 0));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    oicrDownloadServiceMock = {
      download: jest.fn()
    };
    apiMock = {
      GET_Metadata: jest.fn().mockResolvedValue({ data: { portfolio: { id: 2 } } })
    };

    routerMock = {
      navigate: jest.fn().mockResolvedValue(true)
    } as unknown as jest.Mocked<Router>;

    routeMock = {
      snapshot: {
        paramMap: convertToParamMap({}),
        queryParamMap: convertToParamMap({})
      }
    };

    await TestBed.configureTestingModule({
      imports: [OicrDownloadComponent],
      providers: [
        { provide: OicrDownloadService, useValue: oicrDownloadServiceMock },
        { provide: ApiService, useValue: apiMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OicrDownloadComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('calls the download service with the path code', async () => {
      oicrDownloadServiceMock.download.mockResolvedValue(undefined);
      setRoute('554');

      fixture.detectChanges();
      await settle();

      expect(oicrDownloadServiceMock.download).toHaveBeenCalledWith('554', 2);
    });

    it('downloads a Portfolio 1 result from the path code', async () => {
      apiMock.GET_Metadata.mockResolvedValue({ data: { portfolio: { id: 1 } } });
      oicrDownloadServiceMock.download.mockResolvedValue(undefined);
      setRoute('554');

      fixture.detectChanges();
      await settle();

      expect(apiMock.GET_Metadata).toHaveBeenCalledWith('554');
      expect(oicrDownloadServiceMock.download).toHaveBeenCalledWith('554', 1);
    });

    it('downloads a Portfolio 2 result from the path code', async () => {
      apiMock.GET_Metadata.mockResolvedValue({ data: { portfolio: { id: 2 } } });
      oicrDownloadServiceMock.download.mockResolvedValue(undefined);
      setRoute('554');

      fixture.detectChanges();
      await settle();

      expect(apiMock.GET_Metadata).toHaveBeenCalledWith('554');
      expect(oicrDownloadServiceMock.download).toHaveBeenCalledWith('554', 2);
    });

    it('shows an error when metadata is rejected and does not download or navigate', async () => {
      apiMock.GET_Metadata.mockRejectedValue(new Error('metadata failed'));
      setRoute('554');

      fixture.detectChanges();
      await settle();

      expect(fixture.nativeElement.textContent).toContain(OICR_DOWNLOAD_PAGE_PORTFOLIO_ERROR);
      expect(oicrDownloadServiceMock.download).not.toHaveBeenCalled();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('shows an error when metadata has no portfolio and does not download or navigate', async () => {
      apiMock.GET_Metadata.mockResolvedValue({ data: {} });
      setRoute('554');

      fixture.detectChanges();
      await settle();

      expect(fixture.nativeElement.textContent).toContain(OICR_DOWNLOAD_PAGE_PORTFOLIO_ERROR);
      expect(oicrDownloadServiceMock.download).not.toHaveBeenCalled();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('shows an error when metadata has no data and does not download or navigate', async () => {
      apiMock.GET_Metadata.mockResolvedValue({});
      setRoute('554');

      fixture.detectChanges();
      await settle();

      expect(fixture.nativeElement.textContent).toContain(OICR_DOWNLOAD_PAGE_PORTFOLIO_ERROR);
      expect(oicrDownloadServiceMock.download).not.toHaveBeenCalled();
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('redirects a legacy query code to the path form', () => {
      setRoute(undefined, '554');

      fixture.detectChanges();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/oicr/download', '554'], { replaceUrl: true });
      expect(oicrDownloadServiceMock.download).not.toHaveBeenCalled();
    });

    it('shows the missing resultCode error when no code is present', () => {
      fixture.detectChanges();

      expect(component.result).toEqual({
        success: false,
        error: 'Missing resultCode parameter. Please provide a valid resultCode in the URL.'
      });
      expect(fixture.nativeElement.textContent).toContain('Missing resultCode parameter. Please provide a valid resultCode in the URL.');
      expect(oicrDownloadServiceMock.download).not.toHaveBeenCalled();
    });

    it('shows the service error and does not navigate', async () => {
      oicrDownloadServiceMock.download.mockRejectedValue(new Error('Result is not an OICR'));
      setRoute('554');

      fixture.detectChanges();
      await settle();

      expect(fixture.nativeElement.textContent).toContain('Result is not an OICR');
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('navigates to general information after a successful download', async () => {
      oicrDownloadServiceMock.download.mockResolvedValue(undefined);
      setRoute('554');

      fixture.detectChanges();
      await settle();

      expect(routerMock.navigate).toHaveBeenCalledWith(['/result', `${PLATFORM_CODES.STAR}-554`, 'general-information']);
    });

    it('shows Preparing your document while the download is in flight', () => {
      oicrDownloadServiceMock.download.mockReturnValue(new Promise(() => undefined));
      setRoute('554');

      fixture.detectChanges();

      expect(component.processing()).toBe(true);
      expect(fixture.nativeElement.textContent).toContain('Preparing your document');
    });
  });

  describe('generateAndDownload', () => {
    it('should set processing to true and call service', async () => {
      oicrDownloadServiceMock.download.mockResolvedValue(undefined);

      await component.generateAndDownload(12345);

      expect(component.processing()).toBe(false);
      expect(oicrDownloadServiceMock.download).toHaveBeenCalledWith(12345, 2);
      expect(component.result?.success).toBe(true);
    });

    it('should navigate on success with numeric resultCode', async () => {
      oicrDownloadServiceMock.download.mockResolvedValue(undefined);

      await component.generateAndDownload(19542);

      expect(routerMock.navigate).toHaveBeenCalledWith(['/result', `${PLATFORM_CODES.STAR}-19542`, 'general-information']);
    });

    it('should navigate with full resultCode path when resultCode includes dash', async () => {
      oicrDownloadServiceMock.download.mockResolvedValue(undefined);

      await component.generateAndDownload('STAR-19542');

      expect(routerMock.navigate).toHaveBeenCalledWith(['/result', 'STAR-19542', 'general-information']);
    });

    it('should show the service error message and not navigate', async () => {
      oicrDownloadServiceMock.download.mockRejectedValue(new Error('Result is not an OICR'));

      await component.generateAndDownload(12345);

      expect(component.processing()).toBe(false);
      expect(component.result?.success).toBe(false);
      expect(component.result?.error).toBe('Result is not an OICR');
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should reset result before processing', async () => {
      component.result = { success: false, error: 'Previous error' };

      oicrDownloadServiceMock.download.mockResolvedValue(undefined);

      await component.generateAndDownload(12345);

      expect(component.result?.success).toBe(true);
    });

    it('should set processing to false when the download rejects', async () => {
      component.processing.set(true);
      oicrDownloadServiceMock.download.mockRejectedValue(new Error('Result is not an OICR'));

      await component.generateAndDownload(12345);

      expect(component.processing()).toBe(false);
      expect(component.result?.error).toBe('Result is not an OICR');
    });
  });

  describe('getResultCodePath', () => {
    it('should return resultCode as-is when it includes dash', () => {
      const result = (component as any).getResultCodePath('STAR-19542');
      expect(result).toBe('STAR-19542');
    });

    it('should return resultCode as-is when it includes dash (TIP)', () => {
      const result = (component as any).getResultCodePath('TIP-12345');
      expect(result).toBe('TIP-12345');
    });

    it('should prepend STAR- when resultCode is numeric string', () => {
      const result = (component as any).getResultCodePath('19542');
      expect(result).toBe(`${PLATFORM_CODES.STAR}-19542`);
    });

    it('should prepend STAR- when resultCode is number', () => {
      const result = (component as any).getResultCodePath(19542);
      expect(result).toBe(`${PLATFORM_CODES.STAR}-19542`);
    });
  });

  describe('component state', () => {
    it('should initialize with processing as false', () => {
      expect(component.processing()).toBe(false);
    });

    it('should initialize with result as null', () => {
      expect(component.result).toBeNull();
    });
  });
});
