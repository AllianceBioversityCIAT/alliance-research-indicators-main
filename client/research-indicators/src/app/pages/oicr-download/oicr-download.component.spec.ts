import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import OicrDownloadComponent from './oicr-download.component';
import { WasmService, ProcessResult } from '@shared/services/go/wasm.service';
import { OicrDownloadService } from '@shared/services/oicr-download.service';
import { PLATFORM_CODES } from '@shared/constants/platform-codes';

describe('OicrDownloadComponent', () => {
  let component: OicrDownloadComponent;
  let fixture: ComponentFixture<OicrDownloadComponent>;
  let wasmMock: jest.Mocked<WasmService>;
  let oicrDownloadServiceMock: jest.Mocked<OicrDownloadService>;
  let routerMock: jest.Mocked<Router>;
  let routeMock: Partial<ActivatedRoute>;
  let queryParamsSubject: Subject<any>;

  beforeEach(async () => {
    queryParamsSubject = new Subject<any>();

    wasmMock = {
      loadWasm: jest.fn().mockResolvedValue(true)
    } as unknown as jest.Mocked<WasmService>;

    oicrDownloadServiceMock = {
      generateAndDownload: jest.fn()
    } as unknown as jest.Mocked<OicrDownloadService>;

    routerMock = {
      navigate: jest.fn().mockResolvedValue(true)
    } as unknown as jest.Mocked<Router>;

    routeMock = {
      queryParams: queryParamsSubject.asObservable()
    };

    await TestBed.configureTestingModule({
      imports: [OicrDownloadComponent],
      providers: [
        { provide: WasmService, useValue: wasmMock },
        { provide: OicrDownloadService, useValue: oicrDownloadServiceMock },
        { provide: Router, useValue: routerMock },
        { provide: ActivatedRoute, useValue: routeMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OicrDownloadComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    queryParamsSubject.complete();
    jest.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should trigger download when resultCode is present in query params', async () => {
      oicrDownloadServiceMock.generateAndDownload.mockResolvedValue({
        success: true
      } as ProcessResult);

      fixture.detectChanges();
      queryParamsSubject.next({ resultCode: '12345' });

      await fixture.whenStable();

      expect(oicrDownloadServiceMock.generateAndDownload).toHaveBeenCalledWith('12345');
    });

    it('should set error result when resultCode is missing', () => {
      fixture.detectChanges();
      queryParamsSubject.next({});

      expect(component.result).toEqual({
        success: false,
        error: 'Missing resultCode parameter. Please provide a valid resultCode in the URL.'
      });
      expect(oicrDownloadServiceMock.generateAndDownload).not.toHaveBeenCalled();
    });

    it('should not trigger download when resultCode is undefined', () => {
      fixture.detectChanges();
      queryParamsSubject.next({ resultCode: undefined });

      expect(component.result).toEqual({
        success: false,
        error: 'Missing resultCode parameter. Please provide a valid resultCode in the URL.'
      });
      expect(oicrDownloadServiceMock.generateAndDownload).not.toHaveBeenCalled();
    });
  });

  describe('generateAndDownload', () => {
    it('should set processing to true and call service', async () => {
      oicrDownloadServiceMock.generateAndDownload.mockResolvedValue({
        success: true
      } as ProcessResult);

      await component.generateAndDownload(12345);

      expect(component.processing()).toBe(false);
      expect(oicrDownloadServiceMock.generateAndDownload).toHaveBeenCalledWith(12345);
      expect(component.result?.success).toBe(true);
    });

    it('should set wasmLoaded and navigate on success with numeric resultCode', async () => {
      oicrDownloadServiceMock.generateAndDownload.mockResolvedValue({
        success: true
      } as ProcessResult);

      await component.generateAndDownload(19542);

      expect(component.wasmLoaded()).toBe(true);
      expect(routerMock.navigate).toHaveBeenCalledWith([
        '/result',
        `${PLATFORM_CODES.STAR}-19542`,
        'general-information'
      ]);
    });

    it('should navigate with full resultCode path when resultCode includes dash', async () => {
      oicrDownloadServiceMock.generateAndDownload.mockResolvedValue({
        success: true
      } as ProcessResult);

      await component.generateAndDownload('STAR-19542');

      expect(routerMock.navigate).toHaveBeenCalledWith([
        '/result',
        'STAR-19542',
        'general-information'
      ]);
    });

    it('should handle service errors and set processing to false', async () => {
      oicrDownloadServiceMock.generateAndDownload.mockResolvedValue({
        success: false,
        error: 'Failed to load WASM'
      } as ProcessResult);

      await component.generateAndDownload(12345);

      expect(component.processing()).toBe(false);
      expect(component.result?.success).toBe(false);
      expect(component.result?.error).toBe('Failed to load WASM');
      expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('should reset result before processing', async () => {
      component.result = { success: false, error: 'Previous error' } as ProcessResult;

      oicrDownloadServiceMock.generateAndDownload.mockResolvedValue({
        success: true
      } as ProcessResult);

      await component.generateAndDownload(12345);

      expect(component.result?.success).toBe(true);
    });

    it('should always set processing to false in finally block even on error', async () => {
      component.processing.set(true);
      oicrDownloadServiceMock.generateAndDownload.mockRejectedValue(new Error('Test error'));

      try {
        await component.generateAndDownload(12345);
      } catch {
        // Expected to throw
      }

      expect(component.processing()).toBe(false);
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

    it('should initialize with wasmLoaded as false', () => {
      expect(component.wasmLoaded()).toBe(false);
    });
  });
});

