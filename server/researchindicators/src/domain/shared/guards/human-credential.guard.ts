import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { RequestWithUser } from '../global-dto/request-with-user.dto';

export const MACHINE_CREDENTIAL_FORBIDDEN_MESSAGE =
  'This action requires a signed-in user; machine credentials are not allowed.';

/**
 * Denies a request authenticated with a machine credential (the base64
 * `{client_id, client_secret}` app-secret token, `req.credential === 'machine'`
 * set by `JwtMiddleware`).
 *
 * A machine token carries the roles of the secret's responsible user, so
 * `RolesGuard` alone cannot tell an integration from that person. Put this
 * guard on handlers that only a person may call (e.g. Organizational
 * Structure writes, NFR-ORG-004). JWT and the local bypass pass through.
 *
 * @akili-spec institutional-performance/organizational-structure T-13
 */
@Injectable()
export class HumanCredentialGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    if (request?.credential === 'machine') {
      throw new ForbiddenException(MACHINE_CREDENTIAL_FORBIDDEN_MESSAGE);
    }
    return true;
  }
}
