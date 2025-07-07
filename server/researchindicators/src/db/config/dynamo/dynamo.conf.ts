import 'dotenv/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { env } from 'process';

const ddbClient = new DynamoDBClient({
  region: env.ARI_DYNAMO_REGION,
  credentials: {
    accessKeyId: env.ARI_DYNAMO_KEY,
    secretAccessKey: env.ARI_DYNAMO_SECRET_KEY,
  },
});
export { ddbClient };