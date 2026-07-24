import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { DownloadOicrTemplateComponent } from './download-oicr-template.component';
import { WasmService } from '../../services/go/wasm.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { OicrDownloadService } from '@shared/services/oicr-download.service';

describe('DownloadOicrTemplateComponent', () => {
  let component: DownloadOicrTemplateComponent;
  let fixture: ComponentFixture<DownloadOicrTemplateComponent>;
  let wasmMock: jest.Mocked<WasmService>;
  let oicrDownloadServiceMock: jest.Mocked<OicrDownloadService>;
  let cacheMock: jest.Mocked<CacheService>;

  beforeEach(async () => {
    wasmMock = {
      loadWasm: jest.fn().mockResolvedValue(true),
      processDocx: jest.fn(),
      downloadFile: jest.fn()
    } as unknown as jest.Mocked<WasmService>;

    oicrDownloadServiceMock = {
      generateAndDownload: jest.fn()
    } as unknown as jest.Mocked<OicrDownloadService>;

    cacheMock = {
      getCurrentNumericResultId: jest.fn().mockReturnValue(123)
    } as unknown as jest.Mocked<CacheService>;

    await TestBed.configureTestingModule({
      imports: [DownloadOicrTemplateComponent, HttpClientTestingModule],
      providers: [
        { provide: WasmService, useValue: wasmMock },
        { provide: OicrDownloadService, useValue: oicrDownloadServiceMock },
        { provide: CacheService, useValue: cacheMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DownloadOicrTemplateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should set wasmLoaded when loadWasm resolves', async () => {
    component.ngOnInit();
    await Promise.resolve();
    expect(component.wasmLoaded()).toBe(true);
  });

  it('generateAndDownload should call service and update component state on success', async () => {
    const fileData = new Uint8Array([1, 2, 3]);
    oicrDownloadServiceMock.generateAndDownload.mockResolvedValue({
      success: true,
      fileData
    } as any);

    await component.generateAndDownload(123);

    expect(oicrDownloadServiceMock.generateAndDownload).toHaveBeenCalledWith(123);
    expect(component.processing()).toBe(false);
    expect(component.result?.success).toBe(true);
    expect(component.wasmLoaded()).toBe(true);
  });

  it('generateAndDownload should handle errors from service', async () => {
    oicrDownloadServiceMock.generateAndDownload.mockResolvedValue({
      success: false,
      error: 'Failed to load WASM'
    } as any);

    await component.generateAndDownload(123);

    expect(oicrDownloadServiceMock.generateAndDownload).toHaveBeenCalledWith(123);
    expect(component.processing()).toBe(false);
    expect(component.result?.success).toBe(false);
    expect(component.result?.error).toBe('Failed to load WASM');
  });

  it('downloadOicrTemplate should call generateAndDownload with current result ID', async () => {
    oicrDownloadServiceMock.generateAndDownload.mockResolvedValue({
      success: true
    } as any);

    await component.downloadOicrTemplate();

    expect(cacheMock.getCurrentNumericResultId).toHaveBeenCalled();
    expect(oicrDownloadServiceMock.generateAndDownload).toHaveBeenCalledWith(123);
  });
});
