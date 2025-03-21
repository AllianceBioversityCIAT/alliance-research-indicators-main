import { OmitType } from '@nestjs/swagger';
import { SubmissionHistory } from '../entities/submission-history.entity';

export class FindGreenChecksUserDto extends OmitType(SubmissionHistory, [
  'result',
  'from_status',
  'to_status',
]) {
  public user: {
    sec_user_id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}
