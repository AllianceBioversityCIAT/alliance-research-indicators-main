import { SetMetadata } from '@nestjs/common';
import { DynamoParameterDto } from '../interface/dynamo-param.dto';

export const DynamoTable = (tableName: string) =>
  SetMetadata('dynamoTable', tableName);

export const DynamoParameter = (parameters: DynamoParameterDto) =>
  SetMetadata('dynamoparameter', parameters);
