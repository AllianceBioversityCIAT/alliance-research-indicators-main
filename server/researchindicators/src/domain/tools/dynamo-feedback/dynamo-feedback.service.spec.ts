import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DynamoFeedbackService } from './dynamo-feedback.service';
import { IssueCategory } from '../../entities/issue-categories/entities/issue-category.entity';
import * as dynamoConf from '../../../db/config/dynamo/dynamo.conf';

jest.mock('../../../db/config/dynamo/dynamo.conf', () => ({
  ddbClient: { send: jest.fn() },
}));

describe('DynamoFeedbackService', () => {
  let service: DynamoFeedbackService;
  let issueCategoryRepository: { find: jest.Mock };
  let ddbSendMock: jest.Mock;

  const baseDto = {
    user: { sec_user_id: 1, first_name: 'Ana', last_name: 'Test', email: 'a@b.com', user_role_list: [], roleName: 'Admin' },
    description: 'Some issue',
    issueType: ['1', '2'],
    feedbackType: 'bad',
    text: 'The AI output was wrong',
  };

  beforeEach(async () => {
    ddbSendMock = (dynamoConf.ddbClient.send as jest.Mock);
    ddbSendMock.mockReset();

    issueCategoryRepository = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamoFeedbackService,
        {
          provide: getRepositoryToken(IssueCategory),
          useValue: issueCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<DynamoFeedbackService>(DynamoFeedbackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // [CLAUDE/DONE] 188
  describe('saveData', () => {
    it('should save data to DynamoDB and return the saved item', async () => {
      const mockCategories = [
        { issue_category_id: 1, name: 'Bug', description: 'A bug' },
        { issue_category_id: 2, name: 'UX', description: 'UX issue' },
      ];
      issueCategoryRepository.find.mockResolvedValue(mockCategories);
      ddbSendMock.mockResolvedValue({});

      const result = await service.saveData(baseDto);

      expect(issueCategoryRepository.find).toHaveBeenCalled();
      expect(ddbSendMock).toHaveBeenCalled();
      expect(result).toMatchObject({
        feedbackType: { S: 'bad' },
        issueType: { S: '1,2' },
        issueTypeName: { S: 'Bug, UX' },
        description: { S: 'Some issue' },
        text: { S: 'The AI output was wrong' },
      });
    });

    it('should throw InternalServerErrorException when ddbClient.send fails', async () => {
      issueCategoryRepository.find.mockResolvedValue([]);
      ddbSendMock.mockRejectedValue(new Error('DynamoDB down'));

      await expect(service.saveData(baseDto)).rejects.toThrow(
        InternalServerErrorException,
      );
    });

    it('should handle non-bad feedbackType without issueCategory check', async () => {
      issueCategoryRepository.find.mockResolvedValue([]);
      ddbSendMock.mockResolvedValue({});

      const dto = { ...baseDto, feedbackType: 'good', issueType: [] };
      const result = await service.saveData(dto);

      expect(result.feedbackType).toEqual({ S: 'good' });
    });

    it('should join issueType ids with comma', async () => {
      issueCategoryRepository.find.mockResolvedValue([
        { issue_category_id: 3, name: 'Cat3', description: null },
      ]);
      ddbSendMock.mockResolvedValue({});

      const dto = { ...baseDto, issueType: ['3', '4'] };
      const result = await service.saveData(dto);

      expect(result.issueType).toEqual({ S: '3,4' });
    });
  });

  // [CLAUDE/DONE] 189
  describe('getAllFeedback', () => {
    it('should return mapped feedback list from DynamoDB scan', async () => {
      const mockItems = [
        {
          id: { S: 'uuid-1' },
          user: { S: JSON.stringify({ sec_user_id: 1 }) },
          description: { S: 'Desc 1' },
          feedbackType: { S: 'bad' },
          text: { S: 'Some text' },
          issueType: { S: '1' },
          issueTypeName: { S: 'Bug' },
          issueCategoryDescription: { S: 'A bug' },
        },
      ];
      ddbSendMock.mockResolvedValue({ Items: mockItems });

      const result = await service.getAllFeedback();

      expect(ddbSendMock).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('uuid-1');
      expect(result[0].user).toEqual({ sec_user_id: 1 });
      expect(result[0].feedbackType).toBe('bad');
      expect(result[0].issueTypeName).toBe('Bug');
    });

    it('should handle items with missing optional fields gracefully', async () => {
      ddbSendMock.mockResolvedValue({
        Items: [
          { id: { S: 'uuid-2' } },
        ],
      });

      const result = await service.getAllFeedback();

      expect(result[0].id).toBe('uuid-2');
      expect(result[0].user).toBeNull();
      expect(result[0].description).toBe('');
      expect(result[0].feedbackType).toBe('');
    });

    it('should throw InternalServerErrorException when ddbClient.send fails', async () => {
      ddbSendMock.mockRejectedValue(new Error('Scan failed'));

      await expect(service.getAllFeedback()).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});
