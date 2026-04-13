import { Test, TestingModule } from '@nestjs/testing';
import { ReportingFeedbackService } from './reporting-feedback.service';
import { AppConfig } from '../../shared/utils/app-config.util';
import { MessageMicroservice } from '../../tools/broker/message.microservice';
import { TemplateService } from '../../shared/auxiliar/template/template.service';
import { AskForHelp, AskForHelpTypeEnum } from './dto/reporting-feedback.dto';
import { TemplateEnum } from '../../shared/auxiliar/template/enum/template.enum';

describe('ReportingFeedbackService', () => {
  let service: ReportingFeedbackService;
  const sendEmail = jest.fn();
  const getTemplate = jest.fn();

  const mockAppConfig = {
    ARI_IS_PRODUCTION: false,
    ARI_MIS: 'MIS-TEST',
    TECHNICAL_SUPPORT: 'tech@support.test',
    CONTENT_SUPPORT: 'content@support.test',
    COMPLETE_CLIENT_HOST: jest.fn((path: string) => `https://app.test${path}`),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    getTemplate.mockResolvedValue(Buffer.from('<html/>'));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportingFeedbackService,
        { provide: AppConfig, useValue: mockAppConfig },
        {
          provide: MessageMicroservice,
          useValue: { sendEmail },
        },
        {
          provide: TemplateService,
          useValue: { _getTemplate: getTemplate },
        },
      ],
    }).compile();

    service = module.get<ReportingFeedbackService>(ReportingFeedbackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('handleFeedback', () => {
    const baseFeedback = (): AskForHelp =>
      ({
        type: AskForHelpTypeEnum.TECHNICAL_SUPPORT,
        message: 'Help me',
        url: '/results',
        userData: {
          email: 'user@test.com',
          first_name: 'U',
          last_name: 'Ser',
        },
      }) as AskForHelp;

    it('should send technical support email with correct template and routing', async () => {
      await service.handleFeedback(baseFeedback());

      expect(getTemplate).toHaveBeenCalledWith(
        TemplateEnum.ASK_HELP_TECHNICAL,
        expect.objectContaining({
          firstName: 'U',
          lastName: 'Ser',
          description: 'Help me',
          url: 'https://app.test/results',
        }),
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'tech@support.test',
          cc: 'user@test.com',
          subject: expect.stringContaining('Technical Support'),
        }),
      );
    });

    it('should send content support email when type is content', async () => {
      const data = baseFeedback();
      data.type = AskForHelpTypeEnum.CONTENT_SUPPORT;

      await service.handleFeedback(data);

      expect(getTemplate).toHaveBeenCalledWith(
        TemplateEnum.ASK_HELP_CONTENT,
        expect.any(Object),
      );
      expect(sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'content@support.test',
          subject: expect.stringContaining('Content Support'),
        }),
      );
    });
  });
});
