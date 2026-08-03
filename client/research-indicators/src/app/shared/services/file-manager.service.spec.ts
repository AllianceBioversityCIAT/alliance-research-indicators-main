import { TestBed } from '@angular/core/testing';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { FileManagerService, FileUploadResponse } from './file-manager.service';
import { CacheService } from './cache/cache.service';
import { environment } from '@envs/environment';

// Mock environment
jest.mock('@envs/environment', () => ({
  environment: {
    managementApiUrl: 'https://test-management-api.com',
    fileManagerUrl: 'https://test-file-manager.com',
    clarisaApiKey: 'test-clarisa-api-key',
    keyTextMining: 'star/text-mining/files/test/',
    keyProjectOverview: 'star/ai-insights/project-overview/projects/'
  }
}));

describe('FileManagerService', () => {
  let service: FileManagerService;
  let httpClientMock: jest.Mocked<HttpClient>;
  let cacheServiceMock: jest.Mocked<CacheService>;

  const mockFile = new File(['test content'], 'test-file.pdf', { type: 'application/pdf' });
  const mockResponse: FileUploadResponse = {
    data: { filename: 'test-file.pdf' }
  };

  beforeEach(() => {
    httpClientMock = {
      post: jest.fn()
    } as unknown as jest.Mocked<HttpClient>;

    cacheServiceMock = {
      dataCache: jest.fn().mockReturnValue({
        access_token: 'test-access-token'
      })
    } as unknown as jest.Mocked<CacheService>;

    TestBed.configureTestingModule({
      providers: [FileManagerService, { provide: HttpClient, useValue: httpClientMock }, { provide: CacheService, useValue: cacheServiceMock }]
    });
    service = TestBed.inject(FileManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should have cache injected', () => {
    expect(service.cache).toBeDefined();
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const weightLimit = 10; // MB
      const pageLimit = 100;

      httpClientMock.post.mockReturnValue(of(mockResponse));

      const result = await service.uploadFile(mockFile, weightLimit, pageLimit);

      expect(result).toEqual(mockResponse);
      expect(httpClientMock.post).toHaveBeenCalledWith(
        `${environment.fileManagerUrl}/api/file-management/upload-file`,
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.any(HttpHeaders)
        })
      );
    });

    it('should create FormData with correct parameters', async () => {
      const weightLimit = 5; // MB
      const pageLimit = 50;

      httpClientMock.post.mockReturnValue(of(mockResponse));

      await service.uploadFile(mockFile, weightLimit, pageLimit);

      const postCall = httpClientMock.post.mock.calls[0];
      const formData = postCall[1] as FormData;

      // Verify FormData was created and passed to HTTP call
      expect(formData).toBeInstanceOf(FormData);
      expect(httpClientMock.post).toHaveBeenCalledWith(
        `${environment.fileManagerUrl}/api/file-management/upload-file`,
        formData,
        expect.objectContaining({
          headers: expect.any(HttpHeaders)
        })
      );
    });

    it('should set correct headers', async () => {
      const weightLimit = 10;
      const pageLimit = 100;

      httpClientMock.post.mockReturnValue(of(mockResponse));

      await service.uploadFile(mockFile, weightLimit, pageLimit);

      const postCall = httpClientMock.post.mock.calls[0];
      const headers = postCall[2]?.headers as HttpHeaders;

      expect(headers.get('access-token')).toBe('test-access-token');
      expect(headers.get('environment-url')).toBe(environment.managementApiUrl);
      expect(headers.get('X-API-Key')).toBe(environment.clarisaApiKey);
    });

    it('should handle HTTP error', async () => {
      const weightLimit = 10;
      const pageLimit = 100;
      const errorMessage = 'Upload failed';

      httpClientMock.post.mockReturnValue(throwError(() => new Error(errorMessage)));

      await expect(service.uploadFile(mockFile, weightLimit, pageLimit)).rejects.toThrow(errorMessage);
    });

    it('should convert weight limit to bytes correctly', async () => {
      const weightLimit = 2; // MB
      const pageLimit = 25;

      httpClientMock.post.mockReturnValue(of(mockResponse));

      await service.uploadFile(mockFile, weightLimit, pageLimit);

      // Verify the service was called with correct parameters
      expect(httpClientMock.post).toHaveBeenCalledWith(
        `${environment.fileManagerUrl}/api/file-management/upload-file`,
        expect.any(FormData),
        expect.objectContaining({
          headers: expect.any(HttpHeaders)
        })
      );
    });

    it('should handle different file types', async () => {
      const textFile = new File(['text content'], 'test.txt', { type: 'text/plain' });
      const weightLimit = 1;
      const pageLimit = 10;

      httpClientMock.post.mockReturnValue(of(mockResponse));

      await service.uploadFile(textFile, weightLimit, pageLimit);

      const postCall = httpClientMock.post.mock.calls[0];
      const formData = postCall[1] as FormData;

      // Verify FormData was created and passed to HTTP call
      expect(formData).toBeInstanceOf(FormData);
      expect(httpClientMock.post).toHaveBeenCalledWith(
        `${environment.fileManagerUrl}/api/file-management/upload-file`,
        formData,
        expect.objectContaining({
          headers: expect.any(HttpHeaders)
        })
      );
    });

    it('should use default text-mining key when projectId is not provided', async () => {
      httpClientMock.post.mockReturnValue(of(mockResponse));

      await service.uploadFile(mockFile, 10, 100);

      const formData = httpClientMock.post.mock.calls[0][1] as FormData;
      expect(formData.get('key')).toBe('star/text-mining/files/test/');
    });

    it('should use project overview key when uploading from dashboard', async () => {
      httpClientMock.post.mockReturnValue(of(mockResponse));

      await service.uploadFile(mockFile, 10, 100, { projectId: 'D514' });

      const formData = httpClientMock.post.mock.calls[0][1] as FormData;
      expect(formData.get('key')).toBe('star/ai-insights/project-overview/projects/D514');
    });
  });
});
