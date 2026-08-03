import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { OicrDownloadService } from './oicr-download.service';
import { WasmService } from './go/wasm.service';
import { ApiService } from './api.service';
import { GetOICRDetails } from '@shared/interfaces/gets/get-oicr-details.interface';

describe('OicrDownloadService', () => {
  let service: OicrDownloadService;
  let wasmMock: jest.Mocked<WasmService>;
  let apiMock: jest.Mocked<ApiService>;

  beforeEach(() => {
    wasmMock = {
      loadWasm: jest.fn().mockResolvedValue(true),
      processDocx: jest.fn(),
      downloadFile: jest.fn()
    } as unknown as jest.Mocked<WasmService>;

    apiMock = {
      GET_OICRDetails: jest.fn()
    } as unknown as jest.Mocked<ApiService>;

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        OicrDownloadService,
        { provide: WasmService, useValue: wasmMock },
        { provide: ApiService, useValue: apiMock }
      ]
    });

    service = TestBed.inject(OicrDownloadService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('generateAndDownload should load WASM, fetch details, process and download file on success', async () => {
    const data: any = {
      tag_id: 2,
      other_projects: [
        { project_id: 1, project_title: 'Project A' },
        { project_id: 2, project_title: 'Project B' }
      ],
      regions: [{ region_name: 'Africa' }],
      countries: [{ country_name: 'Kenya' }],
      other_levers: [{ lever_full: 'Lever 1' }],
      main_levers: [{ main_lever_name: 'Main Lever 1' }],
      title: 'Test Title',
      main_project: 'Main Project',
      outcome_impact_statement: 'Statement',
      geographic_scope: 'Global',
      geographic_scope_comments: 'Comments',
      handle_link: 'http://test.com'
    };

    apiMock.GET_OICRDetails.mockResolvedValue({ data } as any);
    
    const fileData = new Uint8Array([1, 2, 3]);
    wasmMock.processDocx.mockResolvedValue({
      success: true,
      fileData
    } as any);

    const result = await service.generateAndDownload(123);

    expect(wasmMock.loadWasm).toHaveBeenCalled();
    expect(apiMock.GET_OICRDetails).toHaveBeenCalledWith(123);
    
    // Verify data transformations
    expect(data.other_projects_text).toBe('1 - Project A\n\n2 - Project B');
    expect(data.regions_countries_text).toBe('Regions:\nAfrica\n\nCountries:\nKenya');
    expect(data.tag_name_text).toBe('Updated OICR (Same Level of Maturity)');
    expect(data.others_levers_text).toBe('Lever 1');
    expect(data.main_levers_text).toBe('Main Lever 1');
    
    expect(wasmMock.processDocx).toHaveBeenCalled();
    expect(wasmMock.downloadFile).toHaveBeenCalled();
    expect(result.success).toBe(true);
    
    // Verify filename format
    const [, filename] = (wasmMock.downloadFile.mock.calls[0] as any);
    expect(filename).toMatch(/^STAR_OICR_123_\d{8}_\d{4}\.docx$/);
  });

  it('generateAndDownload should return error if WASM fails to load', async () => {
    wasmMock.loadWasm.mockResolvedValue(false);

    const result = await service.generateAndDownload(123);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to load WASM. Please try again.');
    expect(apiMock.GET_OICRDetails).not.toHaveBeenCalled();
    expect(wasmMock.processDocx).not.toHaveBeenCalled();
  });

  it('generateAndDownload should handle processing errors', async () => {
    const data: any = {
      tag_id: 1,
      other_projects: [],
      regions: [],
      countries: [],
      other_levers: [],
      main_levers: []
    };

    apiMock.GET_OICRDetails.mockResolvedValue({ data } as any);
    wasmMock.processDocx.mockRejectedValue(new Error('Processing failed'));

    const result = await service.generateAndDownload(123);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Error inesperado');
  });

  it('generateAndDownload should format regions and countries correctly', async () => {
    const data: any = {
      tag_id: 1,
      other_projects: [],
      regions: [{ region_name: 'Asia' }],
      countries: [{ country_name: 'India' }, { country_name: 'China' }],
      other_levers: [],
      main_levers: []
    };

    apiMock.GET_OICRDetails.mockResolvedValue({ data } as any);
    wasmMock.processDocx.mockResolvedValue({
      success: true,
      fileData: new Uint8Array([1, 2, 3])
    } as any);

    await service.generateAndDownload(123);

    expect(data.regions_countries_text).toBe('Regions:\nAsia\n\nCountries:\nIndia, China');
  });

  it('generateAndDownload should handle empty regions and countries', async () => {
    const data: any = {
      tag_id: 1,
      other_projects: [],
      regions: [],
      countries: [],
      other_levers: [],
      main_levers: []
    };

    apiMock.GET_OICRDetails.mockResolvedValue({ data } as any);
    wasmMock.processDocx.mockResolvedValue({
      success: true,
      fileData: new Uint8Array([1, 2, 3])
    } as any);

    await service.generateAndDownload(123);

    expect(data.regions_countries_text).toBe('');
  });

  it('generateAndDownload should map tag IDs to text correctly', async () => {
    const testCases = [
      { tag_id: 1, expected: 'New OICR' },
      { tag_id: 2, expected: 'Updated OICR (Same Level of Maturity)' },
      { tag_id: 3, expected: 'Updated OICR (New Level of Maturity)' }
    ];

    for (const testCase of testCases) {
      const data: any = {
        tag_id: testCase.tag_id,
        other_projects: [],
        regions: [],
        countries: [],
        other_levers: [],
        main_levers: []
      };

      apiMock.GET_OICRDetails.mockResolvedValue({ data } as any);
      wasmMock.processDocx.mockResolvedValue({
        success: true,
        fileData: new Uint8Array([1, 2, 3])
      } as any);

      await service.generateAndDownload(123);

      expect(data.tag_name_text).toBe(testCase.expected);
    }
  });
});

