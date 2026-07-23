import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { RouterTestingModule } from '@angular/router/testing';
import WhatsNewHomeComponent from './whats-new-home.component';
import { WhatsNewService } from '../../services/whats-new.service';
import {
  WHATS_NEW_LATEST_COMPACT_COUNT,
  WHATS_NEW_LATEST_COUNT
} from '../../constants/whats-new.constants';

describe('WhatsNewHomeComponent', () => {
  const releaseNoteStub = (id: string) => ({
    id,
    properties: { Name: { title: [{ plain_text: id }] } }
  });

  let fixture: ComponentFixture<WhatsNewHomeComponent>;
  let whatsNewService: {
    notionDataLoading: ReturnType<typeof signal<boolean>>;
    notionDataLoadingMore: ReturnType<typeof signal<boolean>>;
    notionData: ReturnType<typeof signal<{ results: unknown[] } | null>>;
    latestReleaseNotes: ReturnType<typeof signal<unknown[]>>;
    archiveReleaseNotes: ReturnType<typeof signal<unknown[]>>;
    canLoadMoreArchive: ReturnType<typeof signal<boolean>>;
    ensureHomeReleaseNotesLoaded: jest.Mock;
    setLatestVisibleCount: jest.Mock;
    loadMoreArchive: jest.Mock;
    isReleaseNoteNew: jest.Mock;
    getDisplayDate: jest.Mock;
    getColor: jest.Mock;
  };

  beforeEach(async () => {
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn()
      })
    });

    whatsNewService = {
      notionDataLoading: signal(false),
      notionDataLoadingMore: signal(false),
      notionData: signal({ results: [] }),
      latestReleaseNotes: signal([]),
      archiveReleaseNotes: signal([]),
      canLoadMoreArchive: signal(false),
    ensureHomeReleaseNotesLoaded: jest.fn(),
    setLatestVisibleCount: jest.fn(),
    loadMoreArchive: jest.fn(),
      isReleaseNoteNew: jest.fn().mockReturnValue(false),
      getDisplayDate: jest.fn().mockReturnValue('2026-05-06T00:00:00.000Z'),
      getColor: jest.fn().mockReturnValue('#2F5168')
    };

    await TestBed.configureTestingModule({
      imports: [WhatsNewHomeComponent, RouterTestingModule],
      providers: [{ provide: WhatsNewService, useValue: whatsNewService }]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewHomeComponent);
  });

  it('should create, preload home data, and show empty state', () => {
    fixture.detectChanges();
    expect(whatsNewService.ensureHomeReleaseNotesLoaded).toHaveBeenCalled();
    expect(whatsNewService.setLatestVisibleCount).toHaveBeenCalledWith(WHATS_NEW_LATEST_COMPACT_COUNT);
    expect(fixture.nativeElement.textContent).toContain('No published release notes');
  });

  it('should use full latest count at 2xl breakpoint and react to media changes', () => {
    const listeners: Record<string, () => void> = {};
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: true,
        addEventListener: jest.fn((event: string, cb: () => void) => {
          listeners[event] = cb;
        }),
        removeEventListener: jest.fn()
      })
    });

    fixture = TestBed.createComponent(WhatsNewHomeComponent);
    fixture.detectChanges();

    expect(whatsNewService.setLatestVisibleCount).toHaveBeenCalledWith(WHATS_NEW_LATEST_COUNT);

    whatsNewService.setLatestVisibleCount.mockClear();
    listeners['change']?.();
    expect(whatsNewService.setLatestVisibleCount).toHaveBeenCalledWith(WHATS_NEW_LATEST_COUNT);
  });

  it('should cleanup media query listener on destroy', () => {
    const removeEventListener = jest.fn();
    Object.defineProperty(globalThis, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener
      })
    });

    fixture = TestBed.createComponent(WhatsNewHomeComponent);
    fixture.detectChanges();
    fixture.destroy();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('should show loading skeletons', () => {
    whatsNewService.notionDataLoading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Most recent');
    expect(fixture.nativeElement.querySelectorAll('p-skeleton').length).toBeGreaterThan(0);
  });

  it('should render latest and archive sections', () => {
    whatsNewService.latestReleaseNotes.set([releaseNoteStub('latest-1')]);
    whatsNewService.archiveReleaseNotes.set([releaseNoteStub('archive-1')]);
    whatsNewService.notionData.set({ results: [releaseNoteStub('latest-1'), releaseNoteStub('archive-1')] });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Most recent');
    expect(fixture.nativeElement.textContent).toContain('All releases');
    expect(fixture.nativeElement.querySelectorAll('app-release-note-card').length).toBe(2);
  });

  it('should call loadMoreArchive when Load more is clicked', () => {
    whatsNewService.latestReleaseNotes.set([releaseNoteStub('latest-1')]);
    whatsNewService.archiveReleaseNotes.set([releaseNoteStub('archive-1')]);
    whatsNewService.canLoadMoreArchive.set(true);
    whatsNewService.notionData.set({ results: [releaseNoteStub('latest-1'), releaseNoteStub('archive-1')] });
    fixture.detectChanges();

    fixture.componentInstance.loadMoreArchive();

    expect(whatsNewService.loadMoreArchive).toHaveBeenCalled();
  });
});
