import { User } from '../../complementary-entities/secondary/user/user.entity';

export class ValidJwtResponse {
  public isValid: boolean;
  public user?: Partial<User>;
}
