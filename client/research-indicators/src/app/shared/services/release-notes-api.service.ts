import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, expand, EMPTY, reduce, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  NotionBlockChildrenResponse,
  NotionPageResponse,
  NotionQueryResponse,
  NotionReleaseNotePage
} from '@shared/interfaces/notion-release-note.interface';

@Injectable({
  providedIn: 'root'
})
export class ReleaseNotesApiService {
  private readonly http = inject(HttpClient);

  queryReleaseNotesPage(cursor?: string): Observable<NotionQueryResponse> {
    let params = new HttpParams().set('projects', 'STAR').set('status', 'Published');
    if (cursor) {
      params = params.set('start_cursor', cursor);
    }
    return this.http.get<NotionQueryResponse>(
      `${environment.releasesNotesApiUrl}/databases/${environment.releaseNotesDatabaseId}/query`,
      { params }
    );
  }

  queryReleaseNotes(): Observable<NotionQueryResponse> {
    const fetchPage = (cursor?: string) => this.queryReleaseNotesPage(cursor);

    return fetchPage().pipe(
      expand(response => (response.has_more && response.next_cursor ? fetchPage(response.next_cursor) : EMPTY)),
      reduce((acc: NotionReleaseNotePage[], response) => [...acc, ...(response.results ?? [])], [] as NotionReleaseNotePage[]),
      map(results => ({ object: 'list', results, has_more: false }))
    );
  }

  getPage(pageId: string): Observable<NotionPageResponse> {
    return this.http.get<NotionPageResponse>(`${environment.releasesNotesApiUrl}/pages/${pageId}`);
  }

  getBlockChildren(blockId: string): Observable<NotionBlockChildrenResponse> {
    return this.http.get<NotionBlockChildrenResponse>(`${environment.releasesNotesApiUrl}/blocks/${blockId}/children`);
  }
}
