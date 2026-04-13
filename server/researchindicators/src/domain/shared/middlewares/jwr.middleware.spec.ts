import { UnauthorizedException } from '@nestjs/common';
import { JwtMiddleware } from './jwr.middleware';
import { AlianceManagementApp } from '../../tools/broker/aliance-management.app';
import { ResultsUtil } from '../utils/results.util';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

describe('JwtMiddleware', () => {
  const next = jest.fn();
  let middleware: JwtMiddleware;
  const alianceManagementApp = {} as AlianceManagementApp;
  const roarManagementService = {
    validateToken: jest.fn(),
  };
  const resultsUtil = {} as ResultsUtil;
  const appSecretsService = {
    validation: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = new JwtMiddleware(
      alianceManagementApp,
      roarManagementService as any,
      resultsUtil,
      appSecretsService as any,
    );
  });

  it('rejects missing authorization header', async () => {
    const req = { headers: {} } as any;
    await expect(middleware.use(req, {} as any, next)).rejects.toThrow(
      UnauthorizedException,
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects malformed bearer token', async () => {
    const req = { headers: { authorization: 'NotBearer x' } } as any;
    await expect(middleware.use(req, {} as any, next)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('accepts app-secret style base64 token when validation passes', async () => {
    const payload = Buffer.from(
      JSON.stringify({ client_id: 'c', client_secret: 's' }),
    ).toString('base64');
    const req = {
      headers: {
        authorization: `Bearer ${payload}`,
        origin: 'https://app.example',
      },
    } as any;
    appSecretsService.validation.mockResolvedValue({
      isValid: true,
      user: { sec_user_id: 1 },
    });
    await middleware.use(req, {} as any, next);
    expect(appSecretsService.validation).toHaveBeenCalledWith(
      'c',
      's',
      'https://app.example',
    );
    expect(req.user).toEqual({ sec_user_id: 1 });
    expect(next).toHaveBeenCalled();
  });

  it('falls back to Roar when token is not client credentials', async () => {
    const req = {
      headers: { authorization: 'Bearer jwt-token' },
      socket: { remoteAddress: '10.0.0.1' },
    } as any;
    roarManagementService.validateToken.mockResolvedValue({
      isValid: true,
      user: { sec_user_id: 2 },
    });
    await middleware.use(req, {} as any, next);
    expect(roarManagementService.validateToken).toHaveBeenCalledWith(
      'jwt-token',
    );
    expect(req.user).toEqual({ sec_user_id: 2 });
    expect(next).toHaveBeenCalled();
  });

  it('maps TokenExpiredError to Unauthorized', async () => {
    const req = { headers: { authorization: 'Bearer x' } } as any;
    roarManagementService.validateToken.mockRejectedValue(
      new TokenExpiredError('expired', new Date()),
    );
    await expect(middleware.use(req, {} as any, next)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('maps JsonWebTokenError to Unauthorized', async () => {
    const req = { headers: { authorization: 'Bearer x' } } as any;
    roarManagementService.validateToken.mockRejectedValue(
      new JsonWebTokenError('bad'),
    );
    await expect(middleware.use(req, {} as any, next)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
