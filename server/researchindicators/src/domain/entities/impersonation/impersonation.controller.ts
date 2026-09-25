// @akili-spec changes/profile-simulation
import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseFilters,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../shared/decorators/roles.decorator';
import { SecRolesEnum } from '../../shared/enum/sec_role.enum';
import { RolesGuard } from '../../shared/guards/roles.guard';
import { ResponseUtils } from '../../shared/utils/response.utils';
import { RequestWithUser } from '../../shared/global-dto/request-with-user.dto';
import { ImpersonationUserDto } from './dto/impersonation-user.dto';
import { SearchUsersDto } from './dto/search-users.dto';
import { StartImpersonationDto } from './dto/start-impersonation.dto';
import { TargetProfileDto } from './dto/target-profile.dto';
import { ImpersonationErrorCodeEnum } from './enum/impersonation-error-code.enum';
import { ImpersonationServiceError } from './errors/impersonation-service.error';
import { ImpersonationErrorHeaderFilter } from './impersonation-error-header.filter';
import { ImpersonationService } from './impersonation.service';

const SESSION_HEADER = 'X-Impersonation-Session';

/**
 * R-IMP-001/002/004, design §4. Mounted at `impersonation` (see
 * `main.routes.ts`). `users`/`start` are gated by `@Roles(SYSTEM_ADMIN)` +
 * `RolesGuard`; `end`/`current` require only authentication (the effective
 * actor is read from `request.actor ?? request.user`, since a tolerated
 * ended/expired session on those two routes leaves only `request.user` set
 * — design §5 step 6).
 */
@ApiTags('Impersonation')
@ApiBearerAuth()
@UseFilters(ImpersonationErrorHeaderFilter)
@Controller()
export class ImpersonationController {
  constructor(private readonly impersonationService: ImpersonationService) {}

  @Get('users')
  @UseGuards(RolesGuard)
  @Roles(SecRolesEnum.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Search STAR accounts eligible for simulation' })
  @ApiQuery({
    name: 'search',
    required: true,
    description: 'Trimmed, 3-100 chars; matched against email/first/last name',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async searchUsers(
    @Query() query: SearchUsersDto,
    @Req() request: RequestWithUser,
  ) {
    const actorId = this.actorId(request);
    const search = this.escapeLikeWildcards(query.search);
    return this.impersonationService.searchUsers(search, actorId).then((rows) =>
      ResponseUtils.format({
        data: rows.map((row) => ImpersonationUserDto.fromResult(row)),
        description: 'Simulable users found',
        status: HttpStatus.OK,
      }),
    );
  }

  @Post('start')
  @UseGuards(RolesGuard)
  @Roles(SecRolesEnum.SYSTEM_ADMIN)
  @ApiOperation({ summary: 'Start a profile simulation session' })
  @ApiBody({ type: StartImpersonationDto })
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  async start(
    @Body() body: StartImpersonationDto,
    @Req() request: RequestWithUser,
  ) {
    const actorId = this.actorId(request);
    return this.impersonationService
      .start(actorId, body.target_user_id, body.reason)
      .then((result) =>
        ResponseUtils.format({
          data: {
            session: result.session,
            user: TargetProfileDto.fromProfile(result.user),
          },
          description: 'Simulation started',
          status: HttpStatus.CREATED,
        }),
      );
  }

  @Post('end')
  @ApiOperation({ summary: 'End the active simulation session' })
  @ApiHeader({
    name: SESSION_HEADER,
    required: true,
    description: 'Active impersonation session id',
  })
  @ApiBody({
    required: false,
    schema: {
      type: 'object',
      properties: { reason: { type: 'string', enum: ['manual', 'logout'] } },
    },
  })
  async end(
    @Req() request: RequestWithUser,
    @Body() body?: { reason?: 'manual' | 'logout' },
  ) {
    const sessionId = request.header(SESSION_HEADER);
    if (!sessionId) {
      throw new ImpersonationServiceError(
        ImpersonationErrorCodeEnum.SESSION_HEADER_REQUIRED,
        HttpStatus.BAD_REQUEST,
        'X-Impersonation-Session header is required',
      );
    }

    const actorId = this.actorId(request);
    const reason = body?.reason === 'logout' ? 'logout' : 'manual';

    return this.impersonationService
      .end(sessionId, actorId, reason)
      .then((session) =>
        ResponseUtils.format({
          data: session,
          description: 'Simulation ended',
          status: HttpStatus.OK,
        }),
      );
  }

  @Get('current')
  @ApiOperation({ summary: 'Inspect the active simulation session, if any' })
  @ApiHeader({ name: SESSION_HEADER, required: false })
  async current(@Req() request: RequestWithUser) {
    if (request.impersonation?.invalid === 'ended') {
      return ResponseUtils.format({
        data: { active: false },
        description: 'No active simulation',
        status: HttpStatus.OK,
      });
    }

    const sessionId = request.header(SESSION_HEADER);
    const actorId = this.actorId(request);

    return this.impersonationService
      .current(sessionId, actorId)
      .then((result) =>
        ResponseUtils.format({
          data: result.active
            ? {
                ...result,
                user: result.user
                  ? TargetProfileDto.fromProfile(result.user)
                  : undefined,
              }
            : { active: false },
          description: result.active
            ? 'Active simulation'
            : 'No active simulation',
          status: HttpStatus.OK,
        }),
      );
  }

  private actorId(request: RequestWithUser): number {
    const id = (request.actor ?? request.user)?.sec_user_id;
    if (!id) {
      throw new UnauthorizedException('No authenticated actor on request');
    }
    return id;
  }

  /**
   * Optional hardening (T-02 review advisory, not in design.md): escape SQL
   * LIKE metacharacters so an admin's search text cannot widen the match
   * beyond a literal substring. MySQL's default LIKE `ESCAPE` character is
   * `\`, so no `ESCAPE` clause change is needed in the repository (T-02) —
   * escaping here is sufficient. Backslash is escaped first so the
   * subsequent `%`/`_` escaping isn't itself re-escaped.
   */
  private escapeLikeWildcards(value: string): string {
    return value.replace(/[\\%_]/g, (match) => `\\${match}`);
  }
}
