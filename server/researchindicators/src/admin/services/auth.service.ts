import { Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoginDto, ValidateTokenResponseDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  private readonly VALIDATION_URL =
    'https://management-allianceindicatorstest.ciat.cgiar.org/api/authorization/validate-token';

  constructor(private readonly httpService: HttpService) {}

  /**
   * Validate client credentials by creating a base64 token and calling the validation endpoint
   */
  async validateCredentials(
    loginDto: LoginDto,
  ): Promise<{ token: string; isValid: boolean }> {
    try {
      // 1. Create the token object
      const tokenObject = {
        client_id: loginDto.client_id,
        client_secret: loginDto.client_secret,
      };

      // 2. Convert to JSON string and then to base64
      const tokenJson = JSON.stringify(tokenObject);
      const base64Token = Buffer.from(tokenJson).toString('base64');

      // 3. Call the validation endpoint with token in header
      const response = await firstValueFrom(
        this.httpService.patch<ValidateTokenResponseDto>(
          this.VALIDATION_URL,
          null, // No body needed
          {
            headers: {
              accept: '*/*',
              'access-token': base64Token, // Token goes in header, NOT body
            },
          },
        ),
      );

      console.log('Validation response:', response.data);

      // 4. Check if token is valid
      // La respuesta puede venir como { isValid: true } o { data: { isValid: true } }
      const isValid =
        response.data.isValid ?? (response.data as any)?.data?.isValid ?? false;

      if (!isValid) {
        throw new UnauthorizedException('Invalid credentials');
      }

      return {
        token: base64Token,
        isValid: isValid,
      };
    } catch (error) {
      console.error(
        'Authentication error:',
        error.response?.data || error.message,
      );
      throw new UnauthorizedException('Invalid credentials');
    }
  }

  /**
   * Verify if a token is still valid
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      const response = await firstValueFrom(
        this.httpService.patch<ValidateTokenResponseDto>(
          this.VALIDATION_URL,
          null, // No body needed
          {
            headers: {
              accept: '*/*',
              'access-token': token, // Token in header
            },
          },
        ),
      );

      return response.data.isValid;
    } catch (error) {
      console.error(
        'Token verification error:',
        error.response?.data || error.message,
      );
      return false;
    }
  }

  /**
   * Decode base64 token to get credentials (for display purposes only)
   */
  decodeToken(token: string): { client_id: string } | null {
    try {
      const decoded = Buffer.from(token, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      return { client_id: parsed.client_id };
    } catch (error) {
      return null;
    }
  }
}
