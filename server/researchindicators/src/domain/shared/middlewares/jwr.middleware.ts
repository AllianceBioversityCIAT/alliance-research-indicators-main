import { Request, Response, NextFunction } from 'express';
import {
  Injectable,
  Logger,
  NestMiddleware,
  Next,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { RoarManagementService } from '../../tools/roar-management/roar-management.service';
import { ResultsUtil } from '../utils/results.util';
import { AppSecretsService } from '../../entities/app-secrets/app-secrets.service';
import { ENV } from '../utils/env.utils';
import { SecRolesEnum } from '../enum/sec_role.enum';
import {
  REQUEST_AUTH_TYPE_KEY,
  RequestAuthType,
} from '../enum/request-auth-type.enum';

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  private readonly logger = new Logger(JwtMiddleware.name);

  constructor(
    private readonly alianceManagementApp: AlianceManagementApp,
    private readonly roarManagementService: RoarManagementService,
    private readonly resultsUtil: ResultsUtil,
    private readonly appSecretsService: AppSecretsService,
  ) {}

  async use(
    @Req() req: RequestWithCustomAttrs,
    @Res() _res: Response,
    @Next() next: NextFunction,
  ) {
    // LOCAL DEVELOPMENT ONLY — see ENV.LOCAL_AUTH_BYPASS for full safety contract.
    // Active when ARI_LOCAL_AUTH_BYPASS=true AND IS_PRODUCTION=false.
    // MUST NOT be enabled in any deployed environment.
    if (ENV.LOCAL_AUTH_BYPASS) {
      this.logger.warn(
        `[LOCAL_AUTH_BYPASS] Skipping JWT validation for ${req.method} ${req.url} — DEV ONLY`,
      );
      req.user = {
        sec_user_id: 1,
        email: 'local-dev@example.com',
        first_name: 'Local',
        last_name: 'Dev',
        roles: [SecRolesEnum.SYSTEM_ADMIN],
      };
      req[REQUEST_AUTH_TYPE_KEY] = RequestAuthType.LOCAL_BYPASS;
      return next();
    }

    const { authorization } = req.headers;
    if (typeof authorization !== 'string') {
      throw new UnauthorizedException('Token not found');
    }

    const parts = authorization.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid format token');
    }

    const token = parts[1];
    const tokenData = this.validateTokenType(token);

    if (tokenData) {
      const origin = req.headers['origin'];
      const ip =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.socket?.remoteAddress ||
        req.ip;

      const isValid = await this.appSecretsService.validation(
        tokenData.client_id,
        tokenData.client_secret,
        origin ?? ip,
      );

      if (!isValid.isValid) throw new UnauthorizedException('Invalid token');

      req.user = isValid.user;
      // Stamped so a downstream guard can tell a partner integration's token from
      // a person's session. Without it `request.user` is shape-identical for both,
      // and a machine token whose responsible user holds SYSTEM_ADMIN satisfies
      // @Roles(SYSTEM_ADMIN) from any origin.
      req[REQUEST_AUTH_TYPE_KEY] = RequestAuthType.MACHINE_TOKEN;
      return next();
    } else {
      try {
        const responseService =
          await this.roarManagementService.validateToken(token);

        if (responseService.isValid === false)
          throw new UnauthorizedException('Invalid token');
        req.user = responseService.user;
        req[REQUEST_AUTH_TYPE_KEY] = RequestAuthType.ROAR_JWT;
        return next();
      } catch (error) {
        if (error instanceof TokenExpiredError) {
          throw new UnauthorizedException('Token expired');
        } else if (error instanceof JsonWebTokenError) {
          throw new UnauthorizedException('Invalid token');
        } else {
          throw new UnauthorizedException('Unknown token error');
        }
      }
    }
  }

  private validateTokenType(
    token: string,
  ): { client_id: string; client_secret: string } | null {
    try {
      const obj = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      return obj?.client_id && obj?.client_secret ? obj : null;
    } catch {
      return null;
    }
  }
}

interface RequestWithCustomAttrs extends Request {
  [key: string]: any;
}
