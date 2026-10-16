import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CacheService } from './cache/cache.service';
import {
  DocumentOverviewDeleteFilesRequest,
  DocumentOverviewRequest,
  DocumentOverviewResponse
} from '@shared/interfaces/document-overview.interface';
import { environment } from '@envs/environment';

const AI_SERVICES_BUCKET = 'ai-services-ibd';
const MAX_OVERVIEW_TEXT_LENGTH = 20_000;

@Injectable({
  providedIn: 'root'
})
export class DocumentOverviewService {
  private readonly cache = inject(CacheService);

  constructor(private readonly http: HttpClient) {}

  async fetchDocumentOverviewSummary(projectId: string): Promise<DocumentOverviewResponse> {
    const params = new HttpParams()
      .set('bucket_name', AI_SERVICES_BUCKET)
      .set('project_folder', this.buildProjectFolder(projectId));

    try {
      return await firstValueFrom(
        this.http.get<DocumentOverviewResponse>(`${environment.documentOverviewUrl}/api/document-overview`, {
          headers: this.buildAuthHeaders(),
          params
        })
      );
    } catch (error) {
      console.error('Error occurred while fetching document overview summary:', error);
      throw error;
    }
  }

  async generateDocumentOverview(projectId: string, text?: string): Promise<DocumentOverviewResponse> {
    const trimmedText = text?.trim();
    const body: DocumentOverviewRequest = {
      bucket_name: AI_SERVICES_BUCKET,
      project_folder: this.buildProjectFolder(projectId),
      user_id: this.cache.dataCache().user.email,
      ...(trimmedText ? { text: trimmedText.slice(0, MAX_OVERVIEW_TEXT_LENGTH) } : {})
    };

    try {
      return await firstValueFrom(
        this.http.post<DocumentOverviewResponse>(`${environment.documentOverviewUrl}/api/document-overview`, body, {
          headers: this.buildAuthHeaders()
        })
      );
    } catch (error) {
      console.error('Error occurred while generating document overview:', error);
      throw error;
    }
  }

  async deleteDocumentOverviewFiles(projectId: string, fileNames: string[]): Promise<void> {
    const body: DocumentOverviewDeleteFilesRequest = {
      bucket_name: AI_SERVICES_BUCKET,
      project_folder: this.buildProjectFolder(projectId),
      file_names: fileNames
    };

    try {
      await firstValueFrom(
        this.http.post<void>(`${environment.documentOverviewUrl}/api/document-overview/files/delete`, body, {
          headers: this.buildPublicHeaders()
        })
      );
    } catch (error) {
      console.error('Error occurred while deleting document overview files:', error);
      throw error;
    }
  }

  private buildProjectFolder(projectId: string): string {
    return `${environment.keyProjectOverview}${projectId}`;
  }

  private buildPublicHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'no-auth-interceptor': 'true'
    });
  }

  private buildAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      'access-token': this.cache.dataCache().access_token,
      'X-API-Key': environment.clarisaApiKey,
      'Content-Type': 'application/json'
    });
  }
}
