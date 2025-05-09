import { Request, Response, NextFunction } from 'express';
import {
  Injectable,
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

@Injectable()
export class JwtMiddleware implements NestMiddleware {
  constructor(
    private readonly alianceManagementApp: AlianceManagementApp,
    private readonly roarManagementService: RoarManagementService,
    private readonly resultsUtil: ResultsUtil,
  ) {}

  async use(
    @Req() req: RequestWithCustomAttrs,
    @Res() _res: Response,
    @Next() next: NextFunction,
  ) {
    const { authorization } = req.headers;
    if (typeof authorization !== 'string') {
      throw new UnauthorizedException('Token not found');
    }

    const parts = authorization.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new UnauthorizedException('Invalid format token');
    }

    const token = parts[1];

    try {
      const responseService =
        await this.roarManagementService.validateToken(token);

      if (responseService.isValid === false)
        throw new UnauthorizedException('Invalid token');
      req.user = responseService.user;
      next();
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

interface RequestWithCustomAttrs extends Request {
  [key: string]: any;
}
