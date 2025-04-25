import { HttpService } from '@nestjs/axios';
import { ConnectionInterface } from '../../../shared/global-dto/base-control-list-save';
import { firstValueFrom, map } from 'rxjs';
import { env } from 'process';
import { BadRequestException } from '@nestjs/common';

export class AgressoToolsHttp implements ConnectionInterface {
  private readonly agressoHost: string = env.ARI_AGRESSO_URL;
  constructor(private readonly http: HttpService) {}

  private async getToken(): Promise<string> {
    return firstValueFrom(
      this.http
        .post<{ accessToken: string }>(this.agressoHost + 'Auth/api/token', {
          username: env.ARI_AGRESSO_STAFF_USER,
          password: env.ARI_AGRESSO_STAFF_PASS,
        })
        .pipe(
          map(({ data }) => {
            return data.accessToken;
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

  async getRaw<T>(path: string): Promise<T> {
    const auth = await this.setAuth();
    return firstValueFrom(
      this.http
        .get<T>(this.agressoHost + path, auth)
        .pipe(map(({ data }) => data)),
    ).catch((err) => {
      throw new BadRequestException(err);
    });
  }

  async get<T extends { content? }>(path: string): Promise<T> {
    const auth = await this.setAuth();
    return firstValueFrom(
      this.http
        .get<T>(this.agressoHost + path, auth)
        .pipe(map(({ data }) => data.content)),
    ).catch((err) => {
      throw new BadRequestException(err);
    });
  }
}
