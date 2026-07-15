import { Test, TestingModule } from '@nestjs/testing';
import { ReportMsApp } from './report-ms.app';
import { AppConfig } from '../../shared/utils/app-config.util';
import { PdfTemplates } from '../pdf-viewer/enums/pdf-templates.enum';

jest.mock('../../shared/utils/format-date.util', () => ({
  FileDateFormat: { COMPACT_DATETIME: 'YYYYMMDD_HHmm' },
  formatDateForFileName: jest.fn(() => '20260622_1835'),
}));

describe('ReportMsApp', () => {
  let service: ReportMsApp;
  const originalEnv = process.env;

  const brokerResponse = {
    description: 'PDF generated and uploaded successfully',
    status: 200,
    data: { url: 'https://s3.example/pdf' },
  };

  beforeEach(async () => {
    process.env = {
      ...originalEnv,
      ARI_CLARISA_API_KEY: 'test-api-key',
      ARI_REPORT_MS_BUCKET: 'test-bucket',
      ARI_REPORT_MS_QUEUE: 'test-queue',
      ARI_MQ_USER: 'user',
      ARI_MQ_PASSWORD: 'pass',
      ARI_MQ_HOST: 'localhost',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportMsApp,
        { provide: AppConfig, useValue: { ARI_MIS: 'STAR' } },
      ],
    }).compile();

    service = module.get(ReportMsApp);
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.restoreAllMocks();
  });

  it('sends pdf.generateUrl with the report payload and returns the URL', async () => {
    const sendSpy = jest
      .spyOn(service as any, 'sendToPattern')
      .mockResolvedValue(brokerResponse);

    const reportData = { general_information: { title: 'Test' } };
    const url = await service.getPdfReport(
      PdfTemplates.CAP_SHARING,
      8245,
      reportData,
    );

    expect(sendSpy).toHaveBeenCalledWith('pdf.generateUrl', {
      apiKey: 'test-api-key',
      data: reportData,
      templateName: PdfTemplates.CAP_SHARING,
      bucketName: 'test-bucket',
      fileName: 'STAR-result-8245_20260622_1835',
      paperWidth: '600px',
      paperHeight: '1000px',
    });
    expect(url).toBe('https://s3.example/pdf');
  });

  it('returns undefined when broker response has no URL', async () => {
    jest.spyOn(service as any, 'sendToPattern').mockResolvedValue({
      description: 'Unexpected response',
      status: 200,
      data: {},
    });

    const url = await service.getPdfReport(PdfTemplates.CAP_SHARING, 8245, {});

    expect(url).toBeUndefined();
  });

  it('appends px suffix to custom paper dimensions', async () => {
    const sendSpy = jest
      .spyOn(service as any, 'sendToPattern')
      .mockResolvedValue(brokerResponse);

    await service.getPdfReport(
      PdfTemplates.CAP_SHARING,
      8245,
      {},
      {
        paperWidth: '800',
        paperHeight: '1200',
      },
    );

    expect(sendSpy).toHaveBeenCalledWith(
      'pdf.generateUrl',
      expect.objectContaining({
        paperWidth: '800px',
        paperHeight: '1200px',
      }),
    );
  });

  it('rethrows errors from sendToPattern', async () => {
    jest
      .spyOn(service as any, 'sendToPattern')
      .mockRejectedValue(new Error('broker unavailable'));

    await expect(
      service.getPdfReport(PdfTemplates.CAP_SHARING, 8245, {}),
    ).rejects.toThrow('broker unavailable');
  });
});
