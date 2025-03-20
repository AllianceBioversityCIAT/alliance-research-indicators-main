import { Result } from '../entities/result.entity';

export class ResultJoin extends Result {
  public status_name: string;
  public status_description: string;
  public owner_first_name: string;
  public owner_last_name: string;
  public created_first_name: string;
  public created_last_name: string;
}
