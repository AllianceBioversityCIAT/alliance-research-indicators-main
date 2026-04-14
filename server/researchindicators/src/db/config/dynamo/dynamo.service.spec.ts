import { Test, TestingModule } from '@nestjs/testing';
import { ScanCommand } from '@aws-sdk/client-dynamodb';
import { DynamoService } from './dynamo.service';
import { DynamoTables } from './enum/dynamo-tables.enum';

describe('DynamoService', () => {
  let service: DynamoService;
  const send = jest.fn();

  beforeEach(async () => {
    send.mockResolvedValue({ Items: [{ id: { S: '1' } }] });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DynamoService,
        {
          provide: 'DYNAMODB',
          useValue: { send },
        },
      ],
    }).compile();

    service = module.get<DynamoService>(DynamoService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should scan table and return items', async () => {
      const items = await service.findAll(DynamoTables.USER_MANAGEMENT);

      expect(send).toHaveBeenCalledTimes(1);
      const callArg = send.mock.calls[0][0];
      expect(callArg).toBeInstanceOf(ScanCommand);
      expect((callArg as ScanCommand).input).toMatchObject({
        TableName: DynamoTables.USER_MANAGEMENT,
      });
      expect(items).toEqual([{ id: { S: '1' } }]);
    });
  });
});
