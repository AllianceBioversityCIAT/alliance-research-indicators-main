import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CacheService } from './cache/cache.service';
import { ApiService } from './api.service';
import { ResponseAiDto } from '@shared/interfaces/text-mining.interface';
import { environment } from '@envs/environment';

@Injectable({
  providedIn: 'root'
})
export class TextMiningService {
  cache = inject(CacheService);
  api = inject(ApiService);

  constructor(private readonly http: HttpClient) {}

  async executeTextMining(documentName: string): Promise<ResponseAiDto> {
    const formData = new FormData();
    formData.append('token', this.cache.dataCache().access_token);
    formData.append('key', `${environment.keyTextMining}${documentName}`);
    formData.append('bucketName', 'ai-services-ibd');
    formData.append('user_id', this.cache.dataCache().user.email);
    formData.append('environmentUrl', environment.managementApiUrl);

    const headers = new HttpHeaders({
      'access-token': this.cache.dataCache().access_token,
      'X-API-Key': environment.clarisaApiKey
    });

    try {
      const response = await firstValueFrom(this.http.post<ResponseAiDto>(`${environment.textMiningUrl}/star/text-mining`, formData, { headers }));
      return response;
    } catch (error) {
      console.error('Error occurred during text mining:', error);
      throw error;
    }
  }
}
