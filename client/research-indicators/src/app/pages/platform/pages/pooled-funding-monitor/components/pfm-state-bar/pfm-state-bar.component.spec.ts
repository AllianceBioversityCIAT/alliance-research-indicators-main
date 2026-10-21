import { TestBed } from '@angular/core/testing';
import { PfmStateBarComponent, PfmStateSegment } from './pfm-state-bar.component';

const SEGMENTS: PfmStateSegment[] = [
  { key: 'a', label: 'Mapping pending', value: 6, state: 'todo', help: 'Not started.' },
  { key: 'b', label: 'Synced to PRMS', value: 0, state: 'done', help: 'Sent.' },
  { key: 'c', label: 'Out of scope', value: 2, state: 'out', help: 'Never sent.' }
];

function render(segments = SEGMENTS) {
  TestBed.configureTestingModule({ imports: [PfmStateBarComponent] });
  const fixture = TestBed.createComponent(PfmStateBarComponent);
  fixture.componentRef.setInput('segments', segments);
  fixture.componentRef.setInput('label', 'Our side: 8 results');
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement };
}

describe('PfmStateBarComponent', () => {
  it('draws only non-zero states, sized by their value, so the segments are the whole bar', () => {
    const { el } = render();
    const segs = Array.from(el.querySelectorAll<HTMLElement>('[data-testid^="pfm-state-seg-"]'));
    expect(segs.map(s => s.dataset['testid'])).toEqual(['pfm-state-seg-a', 'pfm-state-seg-c']);
    expect(segs.map(s => s.style.flexGrow)).toEqual(['6', '2']);
  });

  it('lists every state (zero included) with its count, share and plain-language help', () => {
    const { el } = render();
    const items = Array.from(el.querySelectorAll('[data-testid^="pfm-state-item-"]'));
    expect(items).toHaveLength(3);
    const row = (key: string) => el.querySelector(`[data-testid="pfm-state-item-${key}"]`)!;
    expect(row('a').querySelector('[data-testid="pfm-state-value"]')?.textContent?.trim()).toBe('6');
    expect(row('a').querySelector('[data-testid="pfm-state-share"]')?.textContent?.trim()).toBe('75%');
    expect(row('b').querySelector('[data-testid="pfm-state-share"]')?.textContent?.trim()).toBe('0%');
    expect(row('c').querySelector('.sr-only')?.textContent?.trim()).toBe('Never sent.');
    expect(row('c').querySelector('[data-testid="pfm-state-label"]')?.getAttribute('tabindex')).toBe('0');
  });

  it('takes each colour from the shared state palette', () => {
    const { fixture } = render();
    const view = fixture.componentInstance.view();
    expect(view.map(v => v.fill)).toEqual(['var(--ac-state-todo-fill)', 'var(--ac-state-done-fill)', 'var(--ac-state-out-fill)']);
    expect(view.map(v => v.fg)).toEqual(['var(--ac-state-todo-fg)', 'var(--ac-state-done-fg)', 'var(--ac-state-out-fg)']);
  });

  it('is an image with an accessible name; an all-zero bar has no segments', () => {
    const { el } = render(SEGMENTS.map(s => ({ ...s, value: 0 })));
    const bar = el.querySelector('[data-testid="pfm-state-bar"]')!;
    expect(bar.getAttribute('role')).toBe('img');
    expect(bar.getAttribute('aria-label')).toBe('Our side: 8 results');
    expect(bar.children).toHaveLength(0);
  });
});
