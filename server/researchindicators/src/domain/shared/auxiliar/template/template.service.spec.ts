import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { TemplateService } from './template.service';
import { TemplateEnum } from './enum/template.enum';
import { Template } from './entities/template.entity';

describe('TemplateService', () => {
  let service: TemplateService;
  const mockFindOne = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplateService,
        {
          provide: DataSource,
          useValue: {
            getRepository: jest.fn().mockImplementation((entity) => {
              if (entity === Template) {
                return { findOne: mockFindOne };
              }
              return {};
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TemplateService>(TemplateService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 158
  describe('_getTemplate', () => {
    it('should return the raw template string when no data is provided', async () => {
      const rawTemplate = '<h1>Hello</h1>';
      mockFindOne.mockResolvedValue({ template: rawTemplate });

      const result = await service._getTemplate(TemplateEnum.WELCOME_EMAIL);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { name: TemplateEnum.WELCOME_EMAIL, is_active: true },
      });
      expect(result).toBe(rawTemplate);
    });

    it('should compile the template with Handlebars when data is provided', async () => {
      const rawTemplate = '<p>Hello {{first_name}}!</p>';
      mockFindOne.mockResolvedValue({ template: rawTemplate });

      const result = await service._getTemplate(TemplateEnum.WELCOME_EMAIL, {
        first_name: 'Ana',
      });

      expect(result).toBe('<p>Hello Ana!</p>');
    });

    it('should return raw template when data is undefined', async () => {
      const rawTemplate = '<p>Static template</p>';
      mockFindOne.mockResolvedValue({ template: rawTemplate });

      const result = await service._getTemplate(
        TemplateEnum.SUBMITTED_RESULT,
        undefined,
      );

      expect(result).toBe(rawTemplate);
    });

    it('should query by the correct template name and is_active=true', async () => {
      mockFindOne.mockResolvedValue({ template: '' });

      await service._getTemplate(TemplateEnum.REVISE_RESULT);

      expect(mockFindOne).toHaveBeenCalledWith({
        where: { name: TemplateEnum.REVISE_RESULT, is_active: true },
      });
    });
  });
});
