import { DynamicModule, Module } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoService } from './dynamo.service';
import { DynamoOptions } from './interface/dynamo-options.dto';

@Module({})
export class DynamoDBModule {
  static forRoot(options: DynamoOptions): DynamicModule {
    return {
      module: DynamoDBModule,
      providers: [
        {
          provide: 'DYNAMODB',
          useValue: new DynamoDBClient({
            region: options.region,
            credentials: {
              accessKeyId: options.credentials.accessKeyId,
              secretAccessKey: options.credentials.secretAccessKey,
            },
          }),
        },
        DynamoService,
      ],
      exports: ['DYNAMODB', DynamoService],
    };
  }
}
