import { Inject, Injectable } from '@nestjs/common';
import { DynamoTables } from './enum/dynamo-tables.enum';
import {
  DynamoDBClient,
  ScanCommand,
  ScanCommandInput,
} from '@aws-sdk/client-dynamodb';

@Injectable()
export class DynamoService {
  constructor(@Inject('DYNAMODB') private readonly _client: DynamoDBClient) {}

  public findAll<T>(tableNames: DynamoTables): Promise<T[]> {
    const params: ScanCommandInput = {
      TableName: tableNames,
    };
    return this._client
      .send(new ScanCommand(params))
      .then((res) => res.Items as T[]);
  }
}
