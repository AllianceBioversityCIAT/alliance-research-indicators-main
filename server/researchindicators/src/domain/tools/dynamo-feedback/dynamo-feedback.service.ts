import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PutItemCommand, ScanCommand } from '@aws-sdk/client-dynamodb';
import { ddbClient } from '../../../db/config/dynamo/dynamo.conf';
import { v4 as uuidv4 } from 'uuid';
import { InjectRepository } from '@nestjs/typeorm';
import { IssueCategory } from '../../entities/issue-categories/entities/issue-category.entity';
import { Repository } from 'typeorm';
import { CreateDynamoFeedbackDto } from './dto/create-dynamo-feedback.dto';



@Injectable()
export class DynamoFeedbackService {
  private readonly tableName = 'feedback_textmining_star_dev';

  constructor(
    @InjectRepository(IssueCategory)
    private readonly issueCategoryRepository: Repository<IssueCategory>,
  ) {}

  async saveData(data: CreateDynamoFeedbackDto): Promise<any> {
    try{
      const issueCategory = await this.issueCategoryRepository.findOne({
        where: { issue_category_id: data.issueType },
        select: ['issue_category_id', 'name', 'description'],
      });

      if (data.feedbackType === 'bad') {
        if (!issueCategory) {
          throw new InternalServerErrorException('IssueType category not found');
        }
      }

      const dataToSave = {
        id: { S: uuidv4() },
        user: { S: JSON.stringify(data.user)},
        description: { S: data.description || '' },
        feedbackType: { S: data.feedbackType || '' },
        text: { S: data.text || '' },
        issueType: { S: String(data.issueType) || '' },
        issueTypeName: { S: issueCategory?.name || '' },
        issueCategoryDescription: { S: issueCategory?.description || '' },
      };

      const command = new PutItemCommand({
        TableName: this.tableName,
        Item: dataToSave,
      });

      await ddbClient.send(command);
      return dataToSave;
    } catch (error) {
      console.error('Error al guardar en DynamoDB:', error);
      throw new InternalServerErrorException({
        message: 'Error al guardar en DynamoDB',
        error: error.message || error,
      });
    }
  }

  async getAllFeedback(): Promise<any> {
    try {
      const command = new ScanCommand({
        TableName: this.tableName,
      });

      const result = await ddbClient.send(command);

      const feedbackList = result.Items.map((item) => ({
        id: item.id?.S || null,
        user: item.user?.S ? JSON.parse(item.user.S) : null,
        description: item.description?.S || '',
        feedbackType: item.feedbackType?.S || '',
        text: item.text?.S || '',
        issueType: item.issueType?.S || '',
        issueTypeName: item.issueTypeName?.S || '',
        issueCategoryDescription: item.issueCategoryDescription?.S || '',
      }));

      return feedbackList;
    } catch (error) {
      console.error('Error al obtener datos de DynamoDB:', error);
      throw new InternalServerErrorException({
        message: 'Error al consultar en DynamoDB',
        error: error.message || error,
      });
    }
  }

}
