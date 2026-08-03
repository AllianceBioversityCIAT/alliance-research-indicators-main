/* eslint-disable @typescript-eslint/no-explicit-any */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { DynamicNotionBlockComponent } from './dynamic-notion-block.component';

describe('DynamicNotionBlockComponent', () => {
  let component: DynamicNotionBlockComponent;
  let fixture: ComponentFixture<DynamicNotionBlockComponent>;
  let router: { navigate: jest.Mock };

  const rich = (text: string, extra: Record<string, unknown> = {}) => ({
    plain_text: text,
    annotations: {},
    ...extra
  });

  beforeEach(async () => {
    router = { navigate: jest.fn().mockResolvedValue(true) };

    await TestBed.configureTestingModule({
      imports: [DynamicNotionBlockComponent],
      providers: [{ provide: Router, useValue: router }]
    }).compileComponents();

    fixture = TestBed.createComponent(DynamicNotionBlockComponent);
    component = fixture.componentInstance;
  });

  const setBlock = (block: any) => {
    component.block = block;
    fixture.detectChanges();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('joinText should return empty for missing input', () => {
    expect(component.joinText(undefined as any)).toBe('');
    expect(component.joinText([])).toBe('');
  });

  it('joinText should apply annotations and links', () => {
    const html = component.joinText([
      rich('Bold', { annotations: { bold: true } }),
      rich('Italic', { annotations: { italic: true } }),
      rich('Under', { annotations: { underline: true } }),
      rich('Strike', { annotations: { strikethrough: true } }),
      rich('Code', { annotations: { code: true } }),
      rich('Mention', { href: 'https://a.com', mention: {} }),
      rich('Link', { href: 'https://b.com' })
    ]);
    expect(html).toContain('font-semibold');
    expect(html).toContain('<em>');
    expect(html).toContain('<u>');
    expect(html).toContain('<s>');
    expect(html).toContain('<code');
    expect(html).toContain('https://a.com');
    expect(html).toContain('https://b.com');
  });

  it('joinPlainText should return unformatted text', () => {
    expect(
      component.joinPlainText([
        { plain_text: 'Hello ', annotations: { bold: true } },
        { plain_text: 'world' }
      ])
    ).toBe('Hello world');
    expect(component.joinPlainText([])).toBe('');
    expect(component.joinPlainText(undefined as any)).toBe('');
    expect(component.joinPlainText([{ annotations: {} }])).toBe('');
  });

  it('getFileBlockUrl, getFileBlockName, getImageBlockUrl, isImageFileName', () => {
    expect(component.getFileBlockUrl({ file: { file: { url: 'f1' } } })).toBe('f1');
    expect(component.getFileBlockUrl({ file: { external: { url: 'f2' } } })).toBe('f2');
    expect(component.getFileBlockUrl({})).toBeNull();
    expect(component.getFileBlockName({ file: { name: 'Doc' } })).toBe('Doc');
    expect(component.getFileBlockName({})).toBe('Download file');
    expect(component.getImageBlockUrl({ image: { file: { url: 'i1' } } })).toBe('i1');
    expect(component.getImageBlockUrl({ image: { external: { url: 'i2' } } })).toBe('i2');
    expect(component.getImageBlockUrl({})).toBeNull();
    expect(component.isImageFileName('shot.PNG')).toBe(true);
    expect(component.isImageFileName('doc.xlsx')).toBe(false);
  });

  it('toggleExpand should flip isExpanded', () => {
    expect(component.isExpanded()).toBe(false);
    component.toggleExpand();
    expect(component.isExpanded()).toBe(true);
  });

  it('navigateToChildPage should route to details', () => {
    component.navigateToChildPage('child-id');
    expect(router.navigate).toHaveBeenCalledWith(['/whats-new/details', 'child-id']);
  });

  it('should render heading_1', () => {
    setBlock({ type: 'heading_1', heading_1: { rich_text: [rich('Title')] } });
    expect(fixture.nativeElement.querySelector('h1')?.textContent).toContain('Title');
  });

  it('should not render empty heading_1', () => {
    setBlock({ type: 'heading_1', heading_1: { rich_text: [] } });
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
  });

  it('should render paragraph with children', () => {
    setBlock({
      type: 'paragraph',
      paragraph: { rich_text: [rich('Parent')] },
      children: [{ id: 'c1', type: 'divider' }]
    });
    expect(fixture.nativeElement.textContent).toContain('Parent');
    expect(fixture.nativeElement.querySelector('hr')).toBeTruthy();
  });

  it('should render callout with emoji and children', () => {
    setBlock({
      type: 'callout',
      callout: { rich_text: [rich('Callout')], icon: { emoji: '🚀' } },
      children: [{ id: 'c1', type: 'heading_2', heading_2: { rich_text: [rich('Sub')] } }]
    });
    expect(fixture.nativeElement.textContent).toContain('Callout');
    expect(fixture.nativeElement.textContent).toContain('Sub');
  });

  it('should render callout with external icon and children without text margin', () => {
    setBlock({
      type: 'callout',
      callout: { rich_text: [], icon: { external: { url: 'https://icon.png' } } },
      children: [{ id: 'c2', type: 'divider' }]
    });
    expect(fixture.nativeElement.querySelector('img[alt="icon"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('hr')).toBeTruthy();
  });

  it('should render image block', () => {
    setBlock({
      type: 'image',
      image: { file: { url: 'https://img.png' }, caption: [rich('cap')] }
    });
    expect(fixture.nativeElement.querySelector('img[alt="Release note illustration"]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('cap');
  });

  it('should render file download block', () => {
    setBlock({
      type: 'file',
      file: { name: 'report.xlsx', file: { url: 'https://file' }, caption: [rich('file cap')] }
    });
    expect(fixture.nativeElement.querySelector('a[download]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('file cap');
  });

  it('should render image file block', () => {
    setBlock({
      type: 'file',
      file: { name: 'pic.png', file: { url: 'https://pic' } }
    });
    expect(fixture.nativeElement.querySelector('img[alt="pic.png"]')).toBeTruthy();
  });

  it('should render pdf block', () => {
    setBlock({
      type: 'pdf',
      pdf: { file: { url: 'https://pdf' }, caption: [rich('pdf cap')] }
    });
    expect(fixture.nativeElement.textContent).toContain('View PDF');
    expect(fixture.nativeElement.textContent).toContain('pdf cap');
  });

  it('should render column_list and column', () => {
    setBlock({
      type: 'column_list',
      children: [
        {
          id: 'col1',
          type: 'column',
          children: [{ id: 'p1', type: 'paragraph', paragraph: { rich_text: [rich('In column')] } }]
        }
      ]
    });
    expect(fixture.nativeElement.textContent).toContain('In column');
  });

  it('should render video file', () => {
    setBlock({ type: 'video', video: { file: { url: 'https://vid.mp4' } } });
    const video = fixture.nativeElement.querySelector('video');
    expect(video).toBeTruthy();
    expect(video?.querySelector('track[kind="captions"]')).toBeTruthy();
    expect(video?.querySelector('track[kind="descriptions"]')).toBeTruthy();
  });

  it('should render external video', () => {
    setBlock({ type: 'video', video: { external: { url: 'https://youtube.com/x' } } });
    expect(fixture.nativeElement.querySelector('a[href="https://youtube.com/x"]')).toBeTruthy();
  });

  it('should render bulleted and numbered list items', () => {
    setBlock({
      type: 'bulleted_list_item',
      bulleted_list_item: { rich_text: [rich('Bullet')] },
      children: [{ id: 'n1', type: 'numbered_list_item', numbered_list_item: { rich_text: [rich('Num')] } }]
    });
    expect(fixture.nativeElement.textContent).toContain('Bullet');
    expect(fixture.nativeElement.textContent).toContain('Num');
    expect(fixture.nativeElement.querySelector('ol li')?.textContent).toContain('Num');
  });

  it('should render numbered list item with ol wrapper', () => {
    setBlock({ type: 'numbered_list_item', numbered_list_item: { rich_text: [rich('Num')] } });
    expect(fixture.nativeElement.querySelector('ol li')?.textContent).toContain('Num');
  });

  it('should apply listStart to numbered list item ol', () => {
    component.listStart = 3;
    setBlock({ type: 'numbered_list_item', numbered_list_item: { rich_text: [rich('Num')] } });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('ol')?.getAttribute('start')).toBe('3');
  });

  it('should render todo item', () => {
    setBlock({
      type: 'to_do',
      to_do: { rich_text: [rich('Task')], checked: true },
      children: [{ id: 'c1', type: 'divider' }]
    });
    expect(fixture.nativeElement.textContent).toContain('Task');
  });

  it('should render quote block', () => {
    setBlock({ type: 'quote', quote: { rich_text: [rich('Quoted')] } });
    expect(fixture.nativeElement.textContent).toContain('Quoted');
  });

  it('should render table block', () => {
    setBlock({
      type: 'table',
      children: [
        {
          id: 'row1',
          table_row: { cells: [[rich('A')], [rich('B')]] }
        },
        {
          id: 'row2',
          table_row: { cells: [[rich('C')], [rich('D')]] }
        }
      ]
    });
    expect(fixture.nativeElement.querySelector('table th')?.textContent).toContain('A');
    expect(fixture.nativeElement.querySelector('table td')?.textContent).toContain('C');
  });

  it('should render table block with row headers', () => {
    setBlock({
      type: 'table',
      table: { has_column_header: false, has_row_header: true },
      children: [
        {
          id: 'row1',
          table_row: { cells: [[rich('Label')], [rich('Value')]] }
        }
      ]
    });
    expect(fixture.nativeElement.querySelector('table th[scope="row"]')?.textContent).toContain('Label');
    expect(fixture.nativeElement.querySelector('table td')?.textContent).toContain('Value');
  });

  it('should render code block', () => {
    setBlock({ type: 'code', code: { rich_text: [rich('const x = 1;')] } });
    expect(fixture.nativeElement.querySelector('pre')?.textContent).toContain('const');
  });

  it('should render child_page and navigate', () => {
    setBlock({ type: 'child_page', id: 'cp1', child_page: { title: 'Child page' } });
    fixture.nativeElement.querySelector('button.cursor-pointer')?.click();
    expect(router.navigate).toHaveBeenCalledWith(['/whats-new/details', 'cp1']);
  });

  it('should render bookmark block', () => {
    setBlock({ type: 'bookmark', bookmark: { url: 'https://bookmark.test' } });
    expect(fixture.nativeElement.querySelector('a')?.getAttribute('href')).toBe('https://bookmark.test');
  });

  it('should render toggle and expand children', () => {
    setBlock({
      type: 'toggle',
      toggle: { rich_text: [rich('Toggle me')] },
      children: [{ id: 't1', type: 'divider' }]
    });
    const toggleHeader = fixture.nativeElement.querySelector('.cursor-pointer');
    toggleHeader?.click();
    fixture.detectChanges();
    expect(component.isExpanded()).toBe(true);
    expect(fixture.nativeElement.querySelector('hr')).toBeTruthy();
  });

  it('should render divider', () => {
    setBlock({ type: 'divider' });
    expect(fixture.nativeElement.querySelector('hr')).toBeTruthy();
  });
});
