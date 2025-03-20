import { Controller } from '@nestjs/common';
import { ResultUsersService } from './result-users.service';
@Controller('result-users')
export class ResultUsersController {
  constructor(private readonly resultUsersService: ResultUsersService) {}
}
