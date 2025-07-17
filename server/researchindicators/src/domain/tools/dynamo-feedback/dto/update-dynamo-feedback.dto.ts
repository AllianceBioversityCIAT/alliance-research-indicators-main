import { PartialType } from '@nestjs/mapped-types';
import { CreateDynamoFeedbackDto } from './create-dynamo-feedback.dto';

export class UpdateDynamoFeedbackDto extends PartialType(
  CreateDynamoFeedbackDto,
) {}
