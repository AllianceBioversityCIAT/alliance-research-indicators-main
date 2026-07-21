import { BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { AppConfigService } from '../../entities/app-config/app-config.service';
import { AppConfigKey } from '../../entities/app-config/enum/app-config-key.enum';
import { AppConfig } from '../../shared/utils/app-config.util';
import { PdfTemplates } from './enums/pdf-templates.enum';
import { PdfViewerService } from './pdf-viewer.service';

describe('PdfViewerService', () => {
  let service: PdfViewerService;

  const appConfigService = {
    getEnv: jest.fn(),
  };
  const httpService = {
    get: jest.fn(),
    post: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    appConfigService.getEnv.mockResolvedValue({
      simple_value: 'api-key-value',
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PdfViewerService,
        { provide: AppConfigService, useValue: appConfigService },
        { provide: HttpService, useValue: httpService },
        {
          provide: AppConfig,
          useValue: { PDF_VIEWER_URL: 'https://pdf-viewer.example' },
        },
      ],
    }).compile();

    service = module.get(PdfViewerService);
    await new Promise((resolve) => setImmediate(resolve));
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('setApiKey', () => {
    it('loads API key from app config', async () => {
      await service.setApiKey();

      expect(appConfigService.getEnv).toHaveBeenCalledWith(
        AppConfigKey.ARI_CLARISA_API_KEY,
      );
    });
  });

  describe('postData', () => {
    it('posts report data and returns uuid', async () => {
      jest
        .spyOn(service as any, 'postRequest')
        .mockReturnValue(of({ data: { uuid: 'abc-uuid' } }));

      const uuid = await service.postData({ title: 'Test' });

      expect((service as any).postRequest).toHaveBeenCalledWith('api/data', {
        title: 'Test',
      });
      expect(uuid).toBe('abc-uuid');
    });

    it('throws BadRequestException when post fails', async () => {
      jest
        .spyOn(service as any, 'postRequest')
        .mockReturnValue(throwError(() => new Error('network')));

      await expect(service.postData({})).rejects.toThrow(BadRequestException);
    });
  });

  describe('renderPdf', () => {
    it('renders PDF with default paper size', async () => {
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: 'pdf-content' }));

      const pdf = await service.renderPdf(PdfTemplates.CAP_SHARING, 'uuid-1');

      expect((service as any).getRequest).toHaveBeenCalledWith(
        'cap_sharing?uuid=uuid-1&&paperWidth=600&paperHeight=1000',
      );
      expect(pdf).toBe('pdf-content');
    });

    it('renders PDF with custom paper size', async () => {
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(of({ data: 'pdf-custom' }));

      const pdf = await service.renderPdf(PdfTemplates.CAP_SHARING, 'uuid-2', {
        width: 800,
        height: 1200,
      });

      expect((service as any).getRequest).toHaveBeenCalledWith(
        'cap_sharing?uuid=uuid-2&&paperWidth=800&paperHeight=1200',
      );
      expect(pdf).toBe('pdf-custom');
    });

    it('throws BadRequestException when render fails', async () => {
      jest
        .spyOn(service as any, 'getRequest')
        .mockReturnValue(throwError(() => new Error('render fail')));

      await expect(
        service.renderPdf(PdfTemplates.CAP_SHARING, 'bad-uuid'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
