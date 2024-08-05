import { DynamoTable } from '../common/dynamo.common';

@DynamoTable('role')
export class Role {
  id: string;
  name: string;
}
