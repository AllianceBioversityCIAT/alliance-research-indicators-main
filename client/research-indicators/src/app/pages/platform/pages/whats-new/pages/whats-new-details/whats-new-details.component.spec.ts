/* eslint-disable @typescript-eslint/no-explicit-any */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';
import WhatsNewDetailsComponent from './whats-new-details.component';
import { WhatsNewService } from '../../services/whats-new.service';

describe('WhatsNewDetailsComponent', () => {
  let fixture: ComponentFixture<WhatsNewDetailsComponent>;
  let component: WhatsNewDetailsComponent;
  let params$: Subject<Record<string, string>>;
  let whatsNewService: {
    notionDataLoading: ReturnType<typeof signal<boolean>>;
    notionDataError: ReturnType<typeof signal<any>>;
    activeNotionPageData: ReturnType<typeof signal<any>>;
    getNotionBlockChildren: jest.Mock;
    getActiveDisplayDate: jest.Mock;
    getActiveNotionPageUrl: jest.Mock;
    getColor: jest.Mock;
  };

  const headerInfo = {
    id: 'page-1',
    created_time: '2026-05-06T00:00:00.000Z',
    cover: { type: 'external', external: { url: 'https://cover.png' } },
    properties: {
      Name: { title: [{ plain_text: 'STAR update' }] },
      Tags: { select: { name: 'Development', color: 'blue' } },
      Projects: { multi_select: [{ name: 'STAR', color: 'purple' }] },
      Developers: {
        people: [
          { id: 'u1', name: 'Alice', avatar_url: 'https://alice.png' },
          { id: 'u2', name: 'Bob' }
        ]
      }
    },
    public_url: 'https://notion.public'
  };

  beforeEach(async () => {
    params$ = new Subject();
    whatsNewService = {
      notionDataLoading: signal(false),
      notionDataError: signal(null),
      activeNotionPageData: signal({
        headerInfo,
        blocks: [
          { id: 'b1', type: 'paragraph', paragraph: { rich_text: [{ plain_text: 'Body' }] } },
          { id: 'b2', type: 'numbered_list_item', numbered_list_item: { rich_text: [{ plain_text: 'One' }] } },
          { id: 'b3', type: 'numbered_list_item', numbered_list_item: { rich_text: [{ plain_text: 'Two' }] } }
        ]
      }),
      getNotionBlockChildren: jest.fn(),
      getActiveDisplayDate: jest.fn().mockReturnValue('2026-05-06T00:00:00.000Z'),
      getActiveNotionPageUrl: jest.fn().mockReturnValue('https://notion.public'),
      getColor: jest.fn().mockReturnValue('#2F5168')
    };

    await TestBed.configureTestingModule({
      imports: [WhatsNewDetailsComponent],
      providers: [
        { provide: WhatsNewService, useValue: whatsNewService },
        {
          provide: ActivatedRoute,
          useValue: { params: params$.asObservable(), snapshot: { paramMap: convertToParamMap({}) } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(WhatsNewDetailsComponent);
    component = fixture.componentInstance;
  });

  it('should create and load page from route params', () => {
    fixture.detectChanges();
    params$.next({ id: 'page-1' });
    expect(component.notionPageId()).toBe('page-1');
    expect(whatsNewService.getNotionBlockChildren).toHaveBeenCalledWith('page-1');
  });

  it('should unsubscribe on destroy', () => {
    fixture.detectChanges();
    params$.next({ id: 'page-1' });
    expect(() => component.ngOnDestroy()).not.toThrow();
  });

  it('getAuthorDisplayNames should join developers', () => {
    expect(component.getAuthorDisplayNames(headerInfo)).toBe('Alice · Bob');
  });

  it('getAuthorDisplayNames should use Added by when no developers', () => {
    expect(
      component.getAuthorDisplayNames({
        properties: { 'Added by': { created_by: { name: 'Creator' } } }
      })
    ).toBe('Creator');
  });

  it('getConsecutiveNumberedItems should collect adjacent numbered items', () => {
    const items = component.getConsecutiveNumberedItems(1);
    expect(items).toHaveLength(2);
    expect(items[0].id).toBe('b2');
  });

  it('getConsecutiveNumberedItems should return empty when index is not numbered', () => {
    expect(component.getConsecutiveNumberedItems(0)).toEqual([]);
  });

  it('getConsecutiveNumberedItems should return empty when blocks are missing', () => {
    whatsNewService.activeNotionPageData.set({ headerInfo, blocks: undefined });
    expect(component.getConsecutiveNumberedItems(0)).toEqual([]);
  });

  it('should show loading skeletons', () => {
    whatsNewService.notionDataLoading.set(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeTruthy();
  });

  it('should show error state', () => {
    whatsNewService.notionDataError.set({ error: true, status: 500, message: 'Server error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Server error');
    expect(fixture.nativeElement.textContent).toContain('500');
  });

  it('should render success header, tags, authors, blocks, and notion link', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('STAR update');
    expect(fixture.nativeElement.textContent).toContain('Development');
    expect(fixture.nativeElement.textContent).toContain('Created by');
    expect(fixture.nativeElement.textContent).toContain('Go to Notion');
    expect(fixture.nativeElement.querySelector('app-dynamic-notion-block')).toBeTruthy();
  });

  it('should render file cover, addedBy-only authors, and no notion url', () => {
    whatsNewService.activeNotionPageData.set({
      headerInfo: {
        properties: {
          title: { title: [{ plain_text: 'Fallback title' }] },
          'Added by': { created_by: { id: 'u9', name: 'Solo' } }
        },
        cover: { type: 'file', file: { url: 'https://file-cover.png' } }
      },
      blocks: []
    });
    whatsNewService.getActiveNotionPageUrl.mockReturnValue(null);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Fallback title');
    expect(fixture.nativeElement.querySelector('img[src="https://file-cover.png"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Solo');
  });

  it('should render without tag, project chips, or author names text', () => {
    whatsNewService.activeNotionPageData.set({
      headerInfo: {
        properties: {
          Name: { title: [{ plain_text: 'Minimal note' }] },
          Developers: { people: [{ id: 'u1', name: '' }] }
        }
      },
      blocks: []
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Minimal note');
    expect(fixture.nativeElement.textContent).not.toContain('Development');
  });

  it('should render no-image cover and STAR platform update without authors', () => {
    whatsNewService.activeNotionPageData.set({
      headerInfo: { properties: { Name: { title: [{ plain_text: 'No authors' }] } } },
      blocks: []
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No image');
    expect(fixture.nativeElement.textContent).toContain('STAR platform update');
  });
});
