// ⚠ No @Roles(...) is applied here.
// RolesGuard.canActivate() returns true when no @Roles metadata is present,
// so any authenticated user reaches the handler — consistent with the
// pi-delegates controller pattern (R-PID-007 / DD-B).  This endpoint is
// a People picker helper accessible to any logged-in user.
import {
  Controller,
  Get,
  HttpStatus,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { ActiveUserResponseDto } from './dto/active-user-response.dto';
import { SearchActiveUsersQueryDto } from './dto/search-active-users.query.dto';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ResponseUtils } from '../../shared/utils/response.utils';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─────────────────────────────────────────────────────────────────────────
  // GET /users/active — list active users for pickers (e.g. PI-delegate People picker)
  // ─────────────────────────────────────────────────────────────────────────
  @Get('active')
  @ApiOperation({
    summary: 'List active users (Accepted + is_active) for pickers',
    description:
      'Returns users whose status_id = 1 (Accepted) AND is_active = TRUE. ' +
      'Pending (status_id = 2) and Rejected (status_id = 3) users are excluded. ' +
      'An optional `search` query parameter filters by first_name, last_name, or email ' +
      '(case-insensitive LIKE match). Results are ordered by last_name, first_name. ' +
      'Intended for use by People picker components such as the PI-delegate assign dialog.',
  })
  @ApiOkResponse({
    type: ActiveUserResponseDto,
    isArray: true,
    description: 'Array of active users matching the filter',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description:
      'Optional name/email filter (matches first_name, last_name, or email)',
  })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  )
  async findActiveUsers(@Query() dto: SearchActiveUsersQueryDto) {
    return this.usersService.findActiveUsers(dto.search).then((data) =>
      ResponseUtils.format({
        data,
        description: 'Active users',
        status: HttpStatus.OK,
      }),
    );
  }
}
