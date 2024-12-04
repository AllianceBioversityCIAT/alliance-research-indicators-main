import { HttpService } from '@nestjs/axios';
import { firstValueFrom, map } from 'rxjs';
import { env } from 'process';
import { BadRequestException } from '@nestjs/common';
import { ConnectionInterface } from '../../shared/global-dto/base-control-list-save';

export class Clarisa implements ConnectionInterface {
  private clarisaHost: string;
  constructor(private http: HttpService) {
    this.clarisaHost = env.ARI_CLARISA_HOST;
  }

  private async getToken(): Promise<string> {
    return firstValueFrom(
      this.http
        .post<{ access_token: string }>(this.clarisaHost + 'auth/login', {
          login: env.ARI_CLARISA_USER,
          password: env.ARI_CLARISA_PASS,
        })
        .pipe(
          map(({ data }) => {
            return data.access_token;
          }),
        ),
    ).catch((err) => {
      throw new BadRequestException(err);
    });
  }

  private async setAuth() {
    const token = await this.getToken();
    if (!token) return undefined;
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }

  public async post<T, X = T>(path: string, data: T): Promise<X> {
    const auth = await this.setAuth();
    return firstValueFrom(
      this.http.post<X>(this.clarisaHost + path, data, auth).pipe(
        map(({ data }) => {
          return data;
        }),
      ),
    ).catch((err) => {
      const message = err?.response?.data?.message || err;
      throw new BadRequestException(message);
    });
  }

  public async get<T>(path: string): Promise<T> {
    const auth = await this.setAuth();
    return firstValueFrom(
      this.http.get<T>(this.clarisaHost + path, auth).pipe(
        map(({ data }) => {
          return data;
        }),
      ),
    ).catch((err) => {
      throw new BadRequestException(err);
    });
  }
}
