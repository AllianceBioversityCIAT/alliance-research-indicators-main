import { DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';

export interface DynamoOptions extends DynamoDBClientConfig {
  credentials: DynamoOptionsCredentials;
}

interface DynamoOptionsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  [key: string]: unknown;
}
