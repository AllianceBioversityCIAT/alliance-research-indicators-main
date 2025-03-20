import { PartialType } from '@nestjs/swagger';
import { Result } from '../../results/entities/result.entity';

export class FindResultsContractDto extends PartialType(Result) {
  created_user: ResultContractCreatedUserDto;
}

export class ResultContractCreatedUserDto {
  first_name: string;
  last_name: string;
  user_id: number;
  is_active: number;
}
