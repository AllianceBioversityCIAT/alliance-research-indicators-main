import { TestBed } from '@angular/core/testing';
import { PfmProgressCardComponent } from './pfm-progress-card.component';
import { PfmPipeline } from '../../pfm.interfaces';

const pipe = (total: number, inPrms: number, out: number): PfmPipeline => ({
  total,
  in_scope: total - out,
  not_synced: total - inPrms - out,
  in_prms: inPrms,
  out_of_scope: out,
  stages: []
});

function render(p: PfmPipeline, scope: 'all' | 'mine' = 'all') {
  TestBed.configureTestingModule({ imports: [PfmProgressCardComponent] });
  const fixture = TestBed.createComponent(PfmProgressCardComponent);
  fixture.componentRef.setInput('pipeline', p);
  fixture.componentRef.setInput('scope', scope);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const text = (id: string) => q(id)?.textContent?.replace(/\s+/g, ' ').trim();
  return { fixture, el, q, text };
}

describe('PfmProgressCardComponent', () => {
  it('done = in PRMS + out of scope; one sentence with what is done and what is left, and the big percentage', () => {
    const { q, text } = render(pipe(108, 60, 8));
    expect(text('pfm-progress-message')).toBe('68 of 108 results completed — 40 left to finish.');
    expect(text('pfm-progress-percent')).toBe('62%');
    expect(q('pfm-progress-fill')?.style.width).toBe(`${(68 / 108) * 100}%`);
  });

  it('is one bar only: no segments, no multi-colour legend', () => {
    const { el, q } = render(pipe(108, 60, 8));
    expect(q('pfm-progress-bar')?.children).toHaveLength(1);
    expect(el.querySelectorAll('ul, li')).toHaveLength(0);
  });

  it('exposes the bar as a progressbar with the counts', () => {
    const { q } = render(pipe(108, 60, 8));
    const bar = q('pfm-progress-bar')!;
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('68');
    expect(bar.getAttribute('aria-valuemax')).toBe('108');
    expect(bar.getAttribute('aria-valuetext')).toBe('68 of 108 results completed');
  });

  it('never shows 100% while something is still pending (floors)', () => {
    const { text } = render(pipe(1000, 999, 0));
    expect(text('pfm-progress-percent')).toBe('99%');
    expect(text('pfm-progress-message')).toContain('1 left to finish');
  });

  it('at 100% the bar is full and the message confirms the close', () => {
    const { q, text } = render(pipe(40, 30, 10));
    expect(text('pfm-progress-percent')).toBe('100%');
    expect(text('pfm-progress-message')).toBe('All caught up — 0 pending.');
    expect(q('pfm-progress-fill')?.style.width).toBe('100%');
  });

  it('nothing to report: 0% and an empty bar, no division by zero', () => {
    const { q, text } = render(pipe(0, 0, 0));
    expect(text('pfm-progress-percent')).toBe('0%');
    expect(text('pfm-progress-message')).toBe('No results to report yet.');
    expect(q('pfm-progress-fill')?.style.width).toBe('0%');
  });

  it('"completed" explains itself (keyboard-focusable tooltip trigger)', () => {
    const { q } = render(pipe(10, 2, 1));
    const help = q('pfm-progress-completed-help')!;
    expect(help.getAttribute('tabindex')).toBe('0');
  });

  it('updates when the pipeline changes after the first render (KZ-015)', () => {
    const { fixture, text } = render(pipe(10, 0, 0));
    expect(text('pfm-progress-percent')).toBe('0%');
    fixture.componentRef.setInput('pipeline', pipe(10, 5, 0));
    fixture.detectChanges();
    expect(text('pfm-progress-percent')).toBe('50%');
  });
});
