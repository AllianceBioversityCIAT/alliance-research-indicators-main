/* eslint-disable @typescript-eslint/no-explicit-any */

import { TestBed } from '@angular/core/testing';
import { NEVER, of, Subject, throwError } from 'rxjs';
import { WhatsNewService } from './whats-new.service';
import { ReleaseNotesApiService } from '@services/release-notes-api.service';
import {
  WHATS_NEW_ARCHIVE_INITIAL_SIZE,
  WHATS_NEW_LAST_SEEN_KEY,
  WHATS_NEW_LATEST_COUNT
} from '../constants/whats-new.constants';
import { NotionReleaseNotePage } from '@shared/interfaces/notion-release-note.interface';

describe('WhatsNewService', () => {
  let service: WhatsNewService;
  let releaseNotesApi: {
    queryReleaseNotesPage: jest.Mock;
    getPage: jest.Mock;
    getBlockChildren: jest.Mock;
  };

  const pageA: NotionReleaseNotePage = {
    id: 'page-a',
    created_time: '2026-05-06T00:00:00.000Z',
    properties: {
      Name: { title: [{ plain_text: 'Note A' }] },
      'Released date': { date: { start: '2026-04-01' } }
    }
  };

  const pageB: NotionReleaseNotePage = {
    id: 'page-b',
    created_time: '2026-04-01T00:00:00.000Z',
    properties: {
      Name: { title: [{ plain_text: 'Note B' }] }
    }
  };

  beforeEach(() => {
    localStorage.clear();
    releaseNotesApi = {
      queryReleaseNotesPage: jest.fn().mockReturnValue(of({ results: [pageB, pageA], has_more: false })),
      getPage: jest.fn(),
      getBlockChildren: jest.fn()
    };

    TestBed.configureTestingModule({
      providers: [WhatsNewService, { provide: ReleaseNotesApiService, useValue: releaseNotesApi }]
    });
    service = TestBed.inject(WhatsNewService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('canLoadMoreArchive should handle null results and empty archive window', () => {
    service.notionData.set({ results: null as any });
    service.setLatestVisibleCount(WHATS_NEW_LATEST_COUNT);
    (service as any).releaseNotesHasMore = false;
    expect(service.canLoadMoreArchive()).toBe(false);

    service.notionData.set({ results: [pageA] });
    service.setLatestVisibleCount(10);
    (service as any).releaseNotesHasMore = true;
    expect(service.canLoadMoreArchive()).toBe(true);
  });

  it('finishReleaseNotesFetch should resume pending fetch when notion data is still null', () => {
    (service as any).pendingMinimumCount = 2;
    service.notionData.set(null);
    (service as any).releaseNotesHasMore = true;
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(
      of({ results: [pageA, pageB], has_more: false, next_cursor: null })
    );

    (service as any).finishReleaseNotesFetch(false);

    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledWith(undefined);
  });

  it('latestReleaseNotes and archiveReleaseNotes should handle missing notion data', () => {
    service.notionData.set(null);
    expect(service.latestReleaseNotes()).toEqual([]);
    expect(service.archiveReleaseNotes()).toEqual([]);

    service.notionData.set({ results: undefined as any });
    expect(service.latestReleaseNotes()).toEqual([]);
    expect(service.archiveReleaseNotes()).toEqual([]);
  });

  it('canLoadMoreArchive should be true when hidden archive items remain loaded', () => {
    const pages = Array.from({ length: 10 }, (_, index) => ({
      id: `page-${index}`,
      created_time: `2026-05-${String(10 - index).padStart(2, '0')}T00:00:00.000Z`,
      properties: {}
    }));
    service.notionData.set({ results: pages as any });
    service.setLatestVisibleCount(3);
    service.archiveVisibleCount.set(3);
    (service as any).releaseNotesHasMore = false;

    expect(service.canLoadMoreArchive()).toBe(true);
  });

  it('canLoadMoreArchive should be false when all loaded archive items are visible and no more pages exist', () => {
    const pages = Array.from({ length: WHATS_NEW_LATEST_COUNT + 4 }, (_, index) => ({
      id: `page-${index}`,
      created_time: `2026-05-${String(10 - index).padStart(2, '0')}T00:00:00.000Z`,
      properties: {}
    }));
    service.notionData.set({ results: pages as any });
    service.archiveVisibleCount.set(4);
    (service as any).releaseNotesHasMore = false;

    expect(service.canLoadMoreArchive()).toBe(false);
  });

  it('loadMoreArchive should handle missing results array when checking loaded count', () => {
    service.notionData.set({ results: undefined as any });
    (service as any).releaseNotesHasMore = true;
    (service as any).releaseNotesNextCursor = 'cursor-1';
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(
      of({ results: [pageA], has_more: false, next_cursor: null })
    );

    service.loadMoreArchive();

    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledWith('cursor-1');
  });

  it('fetchNextReleaseNotesPage should request without cursor when next cursor is missing', () => {
    service.notionData.set({ results: [pageA] });
    (service as any).releaseNotesHasMore = true;
    (service as any).releaseNotesNextCursor = null;
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(
      of({ results: [pageB], has_more: false, next_cursor: null })
    );

    (service as any).fetchReleaseNotesUntil(5);

    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledWith(undefined);
  });

  it('finishReleaseNotesFetch should handle pending minimum with missing results array', () => {
    const firstPage$ = new Subject<any>();
    releaseNotesApi.queryReleaseNotesPage
      .mockReturnValueOnce(firstPage$.asObservable())
      .mockReturnValueOnce(of({ results: [pageB], has_more: false, next_cursor: null }));

    service.getWhatsNewPages();
    service.ensureHomeReleaseNotesLoaded();

    firstPage$.next({ results: undefined, has_more: true, next_cursor: 'next' });
    firstPage$.complete();

    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledTimes(2);
  });

  it('ensureHomeReleaseNotesLoaded should fetch the initial home page batch', () => {
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(of({ results: [pageA], has_more: false }));
    service.ensureHomeReleaseNotesLoaded();
    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledTimes(1);
    expect(service.notionData()?.results).toEqual([pageA]);
  });

  it('loadMoreArchive should skip while a list request is already in flight', () => {
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(NEVER);
    service.ensureHomeReleaseNotesLoaded();
    const visibleBefore = service.archiveVisibleCount();

    service.loadMoreArchive();

    expect(service.archiveVisibleCount()).toBe(visibleBefore);
  });

  it('loadMoreArchive should skip while loading more is already true', () => {
    service.notionDataLoadingMore.set(true);
    const visibleBefore = service.archiveVisibleCount();

    service.loadMoreArchive();

    expect(service.archiveVisibleCount()).toBe(visibleBefore);
    expect(releaseNotesApi.queryReleaseNotesPage).not.toHaveBeenCalled();
  });

  it('loadMoreArchive should fetch additional pages when visible archive exceeds loaded data', () => {
    const pages = Array.from({ length: 10 }, (_, index) => ({
      id: `page-${index}`,
      created_time: `2026-05-${String(10 - index).padStart(2, '0')}T00:00:00.000Z`,
      properties: {}
    }));
    service.notionData.set({ results: pages as any });
    (service as any).releaseNotesHasMore = true;
    (service as any).releaseNotesNextCursor = 'cursor-1';
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(
      of({ results: [pageB], has_more: false, next_cursor: null })
    );

    service.loadMoreArchive();

    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledWith('cursor-1');
    expect(service.notionDataLoadingMore()).toBe(false);
  });

  it('should stop fetching when cached data exists but no more pages are available', () => {
    service.notionData.set({ results: [pageA] });
    (service as any).releaseNotesHasMore = false;
    releaseNotesApi.queryReleaseNotesPage.mockClear();

    service.ensureHomeReleaseNotesLoaded();

    expect(releaseNotesApi.queryReleaseNotesPage).not.toHaveBeenCalled();
  });

  it('should fetch next page recursively until minimum count is met', () => {
    releaseNotesApi.queryReleaseNotesPage
      .mockReturnValueOnce(of({ results: [pageA], has_more: true, next_cursor: 'next' }))
      .mockReturnValueOnce(of({ results: [pageB], has_more: false, next_cursor: null }));

    (service as any).fetchReleaseNotesUntil(2);

    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledTimes(2);
    expect(service.notionData()?.results?.map(page => page.id)).toEqual(['page-a', 'page-b']);
  });

  it('should resume pending minimum fetch after an in-flight request completes', () => {
    const firstPage$ = new Subject<any>();
    releaseNotesApi.queryReleaseNotesPage
      .mockReturnValueOnce(firstPage$.asObservable())
      .mockReturnValueOnce(of({ results: [pageB], has_more: false, next_cursor: null }));

    service.ensureHomeReleaseNotesLoaded();
    service.ensureHomeReleaseNotesLoaded();

    firstPage$.next({ results: [pageA], has_more: true, next_cursor: 'cursor-1' });
    firstPage$.complete();

    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledTimes(2);
    expect(service.notionData()?.results?.map(page => page.id)).toEqual(['page-a', 'page-b']);
  });

  it('should clear pending minimum fetch when no more pages exist', () => {
    const firstPage$ = new Subject<any>();
    releaseNotesApi.queryReleaseNotesPage.mockReturnValueOnce(firstPage$.asObservable());

    service.ensureHomeReleaseNotesLoaded();
    service.ensureHomeReleaseNotesLoaded();

    firstPage$.next({ results: [pageA], has_more: false, next_cursor: null });
    firstPage$.complete();

    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledTimes(1);
  });

  it('canLoadMoreArchive should be true when API still has more pages', () => {
    const pages = Array.from({ length: WHATS_NEW_LATEST_COUNT + WHATS_NEW_ARCHIVE_INITIAL_SIZE }, (_, index) => ({
      id: `page-${index}`,
      created_time: `2026-05-${String(30 - index).padStart(2, '0')}T00:00:00.000Z`,
      properties: {}
    }));
    service.notionData.set({ results: pages as any });
    (service as any).releaseNotesHasMore = true;

    expect(service.canLoadMoreArchive()).toBe(true);
  });

  it('should resume pending minimum fetch when first response satisfied a smaller minimum', () => {
    const firstPage$ = new Subject<any>();
    releaseNotesApi.queryReleaseNotesPage
      .mockReturnValueOnce(firstPage$.asObservable())
      .mockReturnValueOnce(of({ results: [], has_more: false, next_cursor: null }));

    service.getWhatsNewPages();
    service.ensureHomeReleaseNotesLoaded();

    const partialPages = Array.from({ length: 5 }, (_, index) => ({
      id: `partial-${index}`,
      created_time: `2026-05-0${5 - index}T00:00:00.000Z`,
      properties: {}
    }));

    firstPage$.next({ results: partialPages, has_more: true, next_cursor: 'next' });
    firstPage$.complete();

    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledTimes(2);
  });

  it('hasUnreadReleaseNotes should be true when a release is newer than last seen', () => {
    service.notionData.set({ results: [pageA] });
    service.lastSeenAt.set('2020-01-01T00:00:00.000Z');
    expect(service.hasUnreadReleaseNotes()).toBe(true);
  });

  it('processBlocksRecursively should return leaf blocks without fetching children', done => {
    (service as any)
      .processBlocksRecursively([{ id: 'leaf', has_children: false }], 0)
      .subscribe((blocks: any[]) => {
        expect(blocks).toEqual([{ id: 'leaf', has_children: false }]);
        done();
      });
  });

  it('getWhatsNewPages should sort by created_time descending', () => {
    service.getWhatsNewPages();
    expect(service.notionData()?.results?.[0]?.id).toBe('page-a');
    expect(service.notionDataLoading()).toBe(false);
  });

  it('getWhatsNewPages should not call the API again while a request is in flight', () => {
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(NEVER);
    service.getWhatsNewPages();
    service.getWhatsNewPages();
    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledTimes(1);
    expect(service.notionDataLoading()).toBe(true);
  });

  it('getWhatsNewPages should use cached list on subsequent calls without force', () => {
    service.getWhatsNewPages();
    releaseNotesApi.queryReleaseNotesPage.mockClear();
    service.getWhatsNewPages();
    expect(releaseNotesApi.queryReleaseNotesPage).not.toHaveBeenCalled();
  });

  it('getWhatsNewPages should refetch when force is true', () => {
    service.getWhatsNewPages();
    releaseNotesApi.queryReleaseNotesPage.mockClear();
    service.getWhatsNewPages(true);
    expect(releaseNotesApi.queryReleaseNotesPage).toHaveBeenCalledTimes(1);
  });

  it('getWhatsNewPages should handle errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(throwError(() => new Error('fail')));
    service.getWhatsNewPages();
    expect(service.notionDataLoading()).toBe(false);
    consoleSpy.mockRestore();
  });

  it('latestReleaseNotes should expose only the three newest items', () => {
    const pages = Array.from({ length: 5 }, (_, index) => ({
      id: `page-${index}`,
      created_time: `2026-05-0${5 - index}T00:00:00.000Z`,
      properties: {}
    }));
    service.notionData.set({ results: pages as any });
    expect(service.latestReleaseNotes().map(page => page.id)).toEqual(['page-0', 'page-1', 'page-2']);
    expect(service.archiveReleaseNotes().map(page => page.id)).toEqual(['page-3', 'page-4']);
  });

  it('should show two latest items and move the third into archive on compact layout', () => {
    const pages = Array.from({ length: 5 }, (_, index) => ({
      id: `page-${index}`,
      created_time: `2026-05-0${5 - index}T00:00:00.000Z`,
      properties: {}
    }));
    service.notionData.set({ results: pages as any });
    service.setLatestVisibleCount(2);

    expect(service.latestReleaseNotes().map(page => page.id)).toEqual(['page-0', 'page-1']);
    expect(service.archiveReleaseNotes().map(page => page.id)).toEqual(['page-2', 'page-3', 'page-4']);
  });

  it('loadMoreArchive should reveal twenty more archive cards per click', () => {
    const pages = Array.from({ length: 30 }, (_, index) => ({
      id: `page-${index}`,
      created_time: `2026-05-${String(30 - index).padStart(2, '0')}T00:00:00.000Z`,
      properties: {}
    }));
    service.notionData.set({ results: pages as any });
    expect(service.archiveReleaseNotes()).toHaveLength(20);
    service.loadMoreArchive();
    expect(service.archiveReleaseNotes()).toHaveLength(27);
    expect(service.canLoadMoreArchive()).toBe(false);
  });

  it('markWhatsNewAsSeen should persist last seen', () => {
    service.markWhatsNewAsSeen();
    expect(localStorage.getItem(WHATS_NEW_LAST_SEEN_KEY)).toBeTruthy();
    expect(service.lastSeenAt()).toBeTruthy();
  });

  it('hasUnreadReleaseNotes should be true when never seen', () => {
    service.notionData.set({ results: [pageA] });
    expect(service.hasUnreadReleaseNotes()).toBe(true);
  });

  it('hasUnreadReleaseNotes should compare against lastSeenAt', () => {
    service.notionData.set({ results: [pageA] });
    service.lastSeenAt.set('2026-05-07T00:00:00.000Z');
    expect(service.hasUnreadReleaseNotes()).toBe(false);
  });

  it('isReleaseNoteNew should respect last seen', () => {
    service.lastSeenAt.set('2026-05-07T00:00:00.000Z');
    expect(service.isReleaseNoteNew(pageA)).toBe(false);
    service.lastSeenAt.set(null);
    expect(service.isReleaseNoteNew(pageA)).toBe(true);
  });

  it('getDisplayDate should prefer created_time then released date', () => {
    expect(service.getDisplayDate(pageA)).toBe('2026-05-06T00:00:00.000Z');
    expect(
      service.getDisplayDate({
        properties: { 'Released date': { date: { start: '2026-01-15' } } }
      } as NotionReleaseNotePage)
    ).toBe('2026-01-15');
  });

  it('getActiveDisplayDate should return null without header', () => {
    expect(service.getActiveDisplayDate()).toBeNull();
  });

  it('getReleaseNoteTitle and findReleaseNoteById', () => {
    service.notionData.set({ results: [pageA] });
    expect(service.getReleaseNoteTitle(pageA)).toBe('Note A');
    expect(service.getReleaseNoteTitle(null)).toBe('');
    expect(service.findReleaseNoteById('page-a')?.id).toBe('page-a');
  });

  it('getActiveNotionPageUrl should prefer public_url', () => {
    service.activeNotionPageData.set({
      headerInfo: { public_url: 'https://public', url: 'https://private' }
    });
    expect(service.getActiveNotionPageUrl()).toBe('https://public');
    service.activeNotionPageData.set({ headerInfo: { url: 'https://private' } });
    expect(service.getActiveNotionPageUrl()).toBe('https://private');
    service.activeNotionPageData.set(null);
    expect(service.getActiveNotionPageUrl()).toBeNull();
  });

  it('getActiveReleaseNoteTitle should resolve from header or list', () => {
    service.activeNotionPageData.set({
      headerInfo: {
        id: 'page-a',
        properties: { Name: { title: [{ plain_text: 'From Header' }] } }
      }
    });
    expect(service.getActiveReleaseNoteTitle()).toBe('From Header');

    service.activeNotionPageData.set({ headerInfo: { id: 'page-a', properties: {} } });
    service.notionData.set({ results: [pageA] });
    expect(service.getActiveReleaseNoteTitle()).toBe('Note A');

    service.activeNotionPageData.set({ headerInfo: { id: 'missing' } });
    expect(service.getActiveReleaseNoteTitle()).toBe('');
  });

  it('getColor should map all notion colors', () => {
    expect(service.getColor('default')).toBe('#313131');
    expect(service.getColor('gray')).toBe('#414141');
    expect(service.getColor('brown')).toBe('#674133');
    expect(service.getColor('orange')).toBe('#7E4E29');
    expect(service.getColor('yellow')).toBe('#97703D');
    expect(service.getColor('green')).toBe('#2D6044');
    expect(service.getColor('blue')).toBe('#2F5168');
    expect(service.getColor('purple')).toBe('#53376C');
    expect(service.getColor('pink')).toBe('#69334C');
    expect(service.getColor('red')).toBe('#793C3B');
    expect(service.getColor('unknown')).toBe('#313131');
  });

  it('getActiveDisplayDate should use header properties', () => {
    service.activeNotionPageData.set({
      headerInfo: {
        properties: { 'Released date': { date: { start: '2026-01-10' } } }
      }
    });
    expect(service.getActiveDisplayDate()).toBe('2026-01-10');
  });

  it('getNotionBlockChildren should handle page error response', () => {
    releaseNotesApi.getPage.mockReturnValue(
      of({ error: true, status: 404, message: 'Not found' } as any)
    );
    service.getNotionBlockChildren('page-x');
    expect(service.notionDataError()?.status).toBe(404);
    expect(service.notionDataLoading()).toBe(false);
  });

  it('getNotionBlockChildren should default error fields when missing', () => {
    releaseNotesApi.getPage.mockReturnValue(of({ error: true } as any));
    service.getNotionBlockChildren('page-x');
    expect(service.notionDataError()).toEqual({
      error: true,
      status: 0,
      message: 'Unknown error'
    });
  });

  it('getActiveReleaseNoteTitle should return empty when list lookup fails', () => {
    service.activeNotionPageData.set({ headerInfo: { id: 'missing-page', properties: {} } });
    service.notionData.set({ results: [] });
    expect(service.getActiveReleaseNoteTitle()).toBe('');
  });

  it('getActiveReleaseNoteTitle should resolve title from notionData by page id', () => {
    service.activeNotionPageData.set({ headerInfo: { id: 'page-a', properties: {} } });
    service.notionData.set({ results: [pageA] });
    expect(service.getActiveReleaseNoteTitle()).toBe('Note A');
  });

  it('getActiveReleaseNoteTitle should return empty when header has no title or page id', () => {
    service.activeNotionPageData.set({ headerInfo: { properties: {} } });
    expect(service.getActiveReleaseNoteTitle()).toBe('');
  });

  it('hasUnreadReleaseNotes should be false when there are no results after last seen', () => {
    service.notionData.set({ results: [] });
    service.lastSeenAt.set('2020-01-01T00:00:00.000Z');
    expect(service.hasUnreadReleaseNotes()).toBe(false);
  });

  it('hasUnreadReleaseNotes should handle missing notion data', () => {
    service.notionData.set(null);
    service.lastSeenAt.set(null);
    expect(service.hasUnreadReleaseNotes()).toBe(false);

    service.notionData.set({ results: undefined as any });
    expect(service.hasUnreadReleaseNotes()).toBe(false);
  });

  it('getDisplayDate should return null when no dates exist', () => {
    expect(service.getDisplayDate({ properties: {} } as NotionReleaseNotePage)).toBeNull();
  });

  it('getWhatsNewPages should keep undated notes at the end of the sort order', () => {
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(
      of({
        results: [
          { id: 'undated', properties: {} },
          { id: 'dated', created_time: '2026-05-01T00:00:00.000Z', properties: {} }
        ]
      })
    );
    service.getWhatsNewPages();
    expect(service.notionData()?.results?.map(page => page.id)).toEqual(['dated', 'undated']);
  });

  it('getWhatsNewPages should sort using released date when created_time is absent', () => {
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(
      of({
        results: [
          {
            id: 'older',
            properties: { 'Released date': { date: { start: '2026-01-01' } } }
          },
          {
            id: 'newer',
            properties: { 'Released date': { date: { start: '2026-06-01' } } }
          }
        ]
      })
    );
    service.getWhatsNewPages();
    expect(service.notionData()?.results?.[0]?.id).toBe('newer');
  });

  it('getNotionBlockChildren should attach nested children to parent blocks', () => {
    releaseNotesApi.getPage.mockReturnValue(of({ id: 'page-x', properties: {} }));
    releaseNotesApi.getBlockChildren
      .mockReturnValueOnce(
        of({
          results: [{ id: 'parent', type: 'toggle', has_children: true }]
        })
      )
      .mockReturnValueOnce(
        of({
          results: [{ id: 'child', type: 'paragraph', has_children: false, paragraph: { rich_text: [] } }]
        })
      );

    service.getNotionBlockChildren('page-x');
    const parent = service.activeNotionPageData()?.blocks?.[0];
    expect(parent?.children?.[0]?.id).toBe('child');
  });

  it('getNotionBlockChildren should load blocks recursively', () => {
    releaseNotesApi.getPage.mockReturnValue(
      of({
        id: 'page-x',
        created_time: '2026-05-06',
        properties: {},
        url: 'https://notion',
        public_url: 'https://public'
      })
    );
    releaseNotesApi.getBlockChildren.mockReturnValue(
      of({
        results: [
          { id: 'b1', type: 'paragraph', has_children: false },
          {
            id: 'b2',
            type: 'toggle',
            has_children: true,
            children: []
          }
        ]
      })
    );

    service.getNotionBlockChildren('page-x');
    expect(service.activeNotionPageData()?.blocks?.length).toBe(2);
    expect(service.notionDataLoading()).toBe(false);
  });

  it('getNotionBlockChildren should handle nested children and errors', () => {
    releaseNotesApi.getPage.mockReturnValue(of({ id: 'p1', properties: {} }));
    releaseNotesApi.getBlockChildren
      .mockReturnValueOnce(
        of({
          results: [{ id: 'parent', type: 'callout', has_children: true }]
        })
      )
      .mockReturnValueOnce(of({ results: [{ id: 'child', type: 'paragraph', has_children: false }] }))
      .mockReturnValueOnce(throwError(() => new Error('child fail')));

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    service.getNotionBlockChildren('p1');
    expect(releaseNotesApi.getBlockChildren).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('getNotionBlockChildren should handle page and block fetch errors', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    releaseNotesApi.getPage.mockReturnValue(throwError(() => new Error('page fail')));
    service.getNotionBlockChildren('p1');
    expect(service.notionDataLoading()).toBe(false);

    releaseNotesApi.getPage.mockReturnValue(of({ id: 'p1', properties: {} }));
    releaseNotesApi.getBlockChildren.mockReturnValue(throwError(() => new Error('blocks fail')));
    service.getNotionBlockChildren('p1');
    consoleSpy.mockRestore();
  });

  it('processBlocksRecursively should stop at max depth', () => {
    releaseNotesApi.getPage.mockReturnValue(of({ id: 'p1', properties: {} }));
    const deepBlock = { id: 'd0', has_children: true, type: 'toggle' };
    releaseNotesApi.getBlockChildren.mockImplementation(() =>
      of({ results: [{ ...deepBlock, id: `d-${Math.random()}` }] })
    );
    service.getNotionBlockChildren('p1');
    expect(service.notionDataLoading()).toBe(false);
  });

  it('getWhatsNewPages should handle null results in response', () => {
    releaseNotesApi.queryReleaseNotesPage.mockReturnValue(of({ results: null } as any));
    service.getWhatsNewPages();
    expect(service.notionData()?.results).toEqual([]);
  });

  it('loadBlockChildren should handle processBlocksRecursively failure', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    releaseNotesApi.getPage.mockReturnValue(of({ id: 'p1', properties: {} }));
    releaseNotesApi.getBlockChildren.mockReturnValue(of({ results: [{ id: 'b1', has_children: false }] }));
    jest
      .spyOn(service as any, 'processBlocksRecursively')
      .mockReturnValue(throwError(() => new Error('process fail')));

    service.getNotionBlockChildren('p1');
    expect(service.notionDataLoading()).toBe(false);
    consoleSpy.mockRestore();
  });

  it('processBlocksRecursively should return blocks at max depth', done => {
    releaseNotesApi.getBlockChildren.mockReturnValue(of({ results: [] }));
    (service as any).processBlocksRecursively([{ id: 'deep' }], 3).subscribe((blocks: unknown[]) => {
      expect(blocks).toEqual([{ id: 'deep' }]);
      done();
    });
  });

  it('processBlocksRecursively should return empty array for missing blocks', done => {
    (service as any).processBlocksRecursively(null as any, 0).subscribe((blocks: unknown[]) => {
      expect(blocks).toEqual([]);
      done();
    });
  });

  it('processBlocksRecursively should catch child fetch errors', done => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    releaseNotesApi.getBlockChildren.mockReturnValue(throwError(() => new Error('child blocks fail')));
    (service as any)
      .processBlocksRecursively([{ id: 'parent', has_children: true }], 0)
      .subscribe((blocks: any[]) => {
        expect(blocks[0].id).toBe('parent');
        consoleSpy.mockRestore();
        done();
      });
  });

  it('readLastSeen should return null when localStorage throws', () => {
    const getItemSpy = jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [WhatsNewService, { provide: ReleaseNotesApiService, useValue: releaseNotesApi }]
    });
    const fresh = TestBed.inject(WhatsNewService);
    expect(fresh.lastSeenAt()).toBeNull();
    getItemSpy.mockRestore();
  });
});
