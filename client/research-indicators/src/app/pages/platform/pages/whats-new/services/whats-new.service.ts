/* eslint-disable @typescript-eslint/no-explicit-any */

import { computed, inject, Injectable, signal } from '@angular/core';
import { ReleaseNotesApiService } from '@services/release-notes-api.service';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { NotionDataError, NotionReleaseNotePage } from '@shared/interfaces/notion-release-note.interface';
import {
  WHATS_NEW_ARCHIVE_INITIAL_SIZE,
  WHATS_NEW_ARCHIVE_LOAD_MORE_SIZE,
  WHATS_NEW_INITIAL_FETCH_COUNT,
  WHATS_NEW_LAST_SEEN_KEY,
  WHATS_NEW_LATEST_COUNT
} from '../constants/whats-new.constants';

@Injectable({
  providedIn: 'root'
})
export class WhatsNewService {
  private readonly releaseNotesApi = inject(ReleaseNotesApiService);
  private readonly maxRecursionDepth = 3;
  private pagesListLoadInFlight = false;
  private pendingMinimumCount: number | null = null;
  private releaseNotesNextCursor: string | null = null;
  private releaseNotesHasMore = false;

  notionData = signal<{ results: NotionReleaseNotePage[] } | null>(null);
  notionDataLoading = signal(false);
  notionDataLoadingMore = signal(false);
  archiveVisibleCount = signal(WHATS_NEW_ARCHIVE_INITIAL_SIZE);
  latestVisibleCount = signal(WHATS_NEW_LATEST_COUNT);

  latestReleaseNotes = computed(() => (this.notionData()?.results ?? []).slice(0, this.latestVisibleCount()));

  archiveReleaseNotes = computed(() => {
    const results = this.notionData()?.results ?? [];
    const start = this.latestVisibleCount();
    return results.slice(start, start + this.archiveVisibleCount());
  });

  canLoadMoreArchive = computed(() => {
    const results = this.notionData()?.results ?? [];
    const start = this.latestVisibleCount();
    const archiveLoaded = Math.max(0, results.length - start);
    return this.archiveVisibleCount() < archiveLoaded || this.releaseNotesHasMore;
  });

  setLatestVisibleCount(count: number): void {
    this.latestVisibleCount.set(count);
  }
  notionDataError = signal<NotionDataError | null>(null);
  activeNotionPageData = signal<any>(null);
  lastSeenAt = signal<string | null>(this.readLastSeen());

  hasUnreadReleaseNotes = computed(() => {
    const lastSeen = this.lastSeenAt();
    const results = this.notionData()?.results ?? [];
    if (!lastSeen) {
      return results.length > 0;
    }
    const lastSeenTime = new Date(lastSeen).getTime();
    return results.some(page => this.getSortDateTime(page) > lastSeenTime);
  });

  getWhatsNewPages(force = false): void {
    this.fetchReleaseNotesUntil(1, force);
  }

  ensureHomeReleaseNotesLoaded(): void {
    this.fetchReleaseNotesUntil(WHATS_NEW_INITIAL_FETCH_COUNT);
  }

  loadMoreArchive(): void {
    if (this.notionDataLoadingMore() || this.pagesListLoadInFlight) {
      return;
    }

    this.archiveVisibleCount.update(count => count + WHATS_NEW_ARCHIVE_LOAD_MORE_SIZE);
    const requiredLoaded = WHATS_NEW_LATEST_COUNT + this.archiveVisibleCount();
    const loadedCount = this.notionData()?.results?.length ?? 0;

    if (loadedCount < requiredLoaded && this.releaseNotesHasMore) {
      this.fetchReleaseNotesUntil(requiredLoaded, false, true);
    }
  }

  private fetchReleaseNotesUntil(minimumCount: number, force = false, appendOnly = false): void {
    const currentCount = this.notionData()?.results?.length ?? 0;

    if (this.pagesListLoadInFlight) {
      if (currentCount < minimumCount) {
        this.pendingMinimumCount = Math.max(this.pendingMinimumCount ?? 0, minimumCount);
      }
      return;
    }

    if (!force && currentCount >= minimumCount) {
      return;
    }
    if (!force && this.notionData() !== null && !this.releaseNotesHasMore) {
      return;
    }

    if (force) {
      this.notionData.set(null);
      this.releaseNotesNextCursor = null;
      this.releaseNotesHasMore = false;
      this.archiveVisibleCount.set(WHATS_NEW_ARCHIVE_INITIAL_SIZE);
      this.latestVisibleCount.set(WHATS_NEW_LATEST_COUNT);
    }

    const showPrimaryLoader = this.notionData() === null;
    if (showPrimaryLoader) {
      this.notionDataLoading.set(true);
    } else if (appendOnly) {
      this.notionDataLoadingMore.set(true);
    }

    this.pagesListLoadInFlight = true;
    this.fetchNextReleaseNotesPage(minimumCount, showPrimaryLoader || appendOnly);
  }

  private fetchNextReleaseNotesPage(minimumCount: number, trackLoadingFlag: boolean): void {
    const cursor = this.notionData() === null ? undefined : this.releaseNotesNextCursor ?? undefined;

    this.releaseNotesApi.queryReleaseNotesPage(cursor).subscribe({
      next: res => {
        const merged = [...(this.notionData()?.results ?? []), ...(res.results ?? [])];
        merged.sort((a, b) => this.getSortDateTime(b) - this.getSortDateTime(a));
        this.notionData.set({ results: merged });
        this.releaseNotesHasMore = Boolean(res.has_more);
        this.releaseNotesNextCursor = res.next_cursor ?? null;

        const loadedCount = merged.length;
        if (loadedCount < minimumCount && this.releaseNotesHasMore && this.releaseNotesNextCursor) {
          this.fetchNextReleaseNotesPage(minimumCount, trackLoadingFlag);
          return;
        }

        this.finishReleaseNotesFetch(trackLoadingFlag);
      },
      error: err => {
        console.error('Error loading release notes', err);
        this.finishReleaseNotesFetch(trackLoadingFlag);
      }
    });
  }

  private finishReleaseNotesFetch(trackLoadingFlag: boolean): void {
    this.pagesListLoadInFlight = false;
    if (trackLoadingFlag) {
      this.notionDataLoading.set(false);
      this.notionDataLoadingMore.set(false);
    }

    const pendingMinimum = this.pendingMinimumCount;
    this.pendingMinimumCount = null;
    if (pendingMinimum === null) {
      return;
    }

    const loadedCount = this.notionData()?.results?.length ?? 0;
    if (loadedCount < pendingMinimum && this.releaseNotesHasMore) {
      this.fetchReleaseNotesUntil(pendingMinimum);
    }
  }

  markWhatsNewAsSeen(): void {
    const now = new Date().toISOString();
    localStorage.setItem(WHATS_NEW_LAST_SEEN_KEY, now);
    this.lastSeenAt.set(now);
  }

  isReleaseNoteNew(item: NotionReleaseNotePage): boolean {
    const lastSeen = this.lastSeenAt();
    if (!lastSeen) {
      return true;
    }
    return this.getSortDateTime(item) > new Date(lastSeen).getTime();
  }

  getDisplayDate(page: NotionReleaseNotePage): string | null {
    if (page.created_time) {
      return page.created_time;
    }
    return page?.properties?.['Released date']?.date?.start ?? null;
  }

  getActiveDisplayDate(): string | null {
    const headerInfo = this.activeNotionPageData()?.headerInfo;
    if (!headerInfo) {
      return null;
    }
    return this.getDisplayDate({
      created_time: headerInfo.created_time,
      properties: headerInfo.properties
    } as NotionReleaseNotePage);
  }

  getReleaseNoteTitle(page?: NotionReleaseNotePage | null): string {
    if (!page?.properties) {
      return '';
    }
    return page.properties['Name']?.title?.[0]?.plain_text ?? '';
  }

  getActiveNotionPageUrl(): string | null {
    const headerInfo = this.activeNotionPageData()?.headerInfo;
    return headerInfo?.public_url ?? headerInfo?.url ?? null;
  }

  getActiveReleaseNoteTitle(): string {
    const headerInfo = this.activeNotionPageData()?.headerInfo;
    const fromHeader = this.getReleaseNoteTitle({
      properties: headerInfo?.properties
    } as NotionReleaseNotePage);
    if (fromHeader) {
      return fromHeader;
    }

    const pageId = headerInfo?.id;
    if (pageId) {
      return this.getReleaseNoteTitle(this.findReleaseNoteById(pageId));
    }

    return '';
  }

  findReleaseNoteById(pageId: string): NotionReleaseNotePage | undefined {
    return this.notionData()?.results?.find(item => item.id === pageId);
  }

  getNotionBlockChildren(notionBlockId: string): void {
    this.notionDataLoading.set(true);

    this.releaseNotesApi.getPage(notionBlockId).subscribe({
      next: pageRes => {
        if (pageRes.error) {
          this.notionDataError.set({
            error: true,
            status: pageRes.status ?? 0,
            message: pageRes.message ?? 'Unknown error'
          });
          this.notionDataLoading.set(false);
          return;
        }

        this.activeNotionPageData.set({
          headerInfo: {
            id: pageRes.id,
            created_time: pageRes.created_time,
            cover: pageRes.cover,
            properties: pageRes.properties,
            url: pageRes.url,
            public_url: pageRes.public_url
          }
        });

        this.loadBlockChildren(notionBlockId);
      },
      error: err => {
        this.notionDataLoading.set(false);
        console.error('Error loading release note page', err);
      }
    });
  }

  getColor(color: string): string {
    switch (color) {
      case 'default':
        return '#313131';
      case 'gray':
        return '#414141';
      case 'brown':
        return '#674133';
      case 'orange':
        return '#7E4E29';
      case 'yellow':
        return '#97703D';
      case 'green':
        return '#2D6044';
      case 'blue':
        return '#2F5168';
      case 'purple':
        return '#53376C';
      case 'pink':
        return '#69334C';
      case 'red':
        return '#793C3B';
      default:
        return '#313131';
    }
  }

  private loadBlockChildren(notionBlockId: string): void {
    this.releaseNotesApi.getBlockChildren(notionBlockId).subscribe({
      next: res => {
        this.processBlocksRecursively(res.results, 0).subscribe({
          next: processedBlocks => {
            this.activeNotionPageData.set({
              ...this.activeNotionPageData(),
              blocks: processedBlocks
            });
            this.notionDataLoading.set(false);
            this.notionDataError.set(null);
          },
          error: err => {
            this.notionDataLoading.set(false);
            console.error('Error processing notion blocks recursively:', err);
          }
        });
      },
      error: err => {
        this.notionDataLoading.set(false);
        console.error('Error fetching notion blocks:', err);
      }
    });
  }

  private processBlocksRecursively(blocks: any[], depth: number): Observable<any[]> {
    if (depth >= this.maxRecursionDepth || !blocks?.length) {
      return of(blocks ?? []);
    }

    const processedBlocksObservables = blocks.map(block => {
      if (block.has_children) {
        return this.releaseNotesApi.getBlockChildren(block.id).pipe(
          switchMap(childrenRes => this.processBlocksRecursively(childrenRes.results, depth + 1)),
          map(processedChildren => ({ ...block, children: processedChildren })),
          catchError(err => {
            console.error(`Error processing child blocks for ${block.id}:`, err);
            return of(block);
          })
        );
      }
      return of(block);
    });

    return forkJoin(processedBlocksObservables);
  }

  private getSortDateTime(page: NotionReleaseNotePage): number {
    if (page.created_time) {
      return new Date(page.created_time).getTime();
    }
    const released = page?.properties?.['Released date']?.date?.start;
    return released ? new Date(released).getTime() : 0;
  }

  private readLastSeen(): string | null {
    try {
      return localStorage.getItem(WHATS_NEW_LAST_SEEN_KEY);
    } catch {
      return null;
    }
  }
}
