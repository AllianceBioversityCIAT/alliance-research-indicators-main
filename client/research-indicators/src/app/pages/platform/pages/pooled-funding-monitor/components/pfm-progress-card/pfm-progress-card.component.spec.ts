import { TestBed } from '@angular/core/testing';
import { PfmProgressCardComponent } from './pfm-progress-card.component';
import { PfmChipCounts } from '../../pfm.interfaces';

const counts = (synced: number, attention: number, noSp = 0): PfmChipCounts => ({ all: synced + attention + noSp, attention, mapping: 0, ready: 0, prms_rejected: 0, synced, no_sp: noSp });

function render(c: PfmChipCounts) {
  TestBed.configureTestingModule({ imports: [PfmProgressCardComponent] });
  const fixture = TestBed.createComponent(PfmProgressCardComponent);
  fixture.componentRef.setInput('counts', c);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const text = (id: string) => q(id)?.textContent?.replace(/\s+/g, ' ').trim();
  return { fixture, el, q, text };
}

describe('PfmProgressCardComponent', () => {
  it('done = in PRMS + no SP contribution, over every result: the legend above, the percentage inside the bar, no count line', () => {
    const { q, text } = render(counts(21, 113, 33));
    // (21 + 33) / 167
    expect(text('pfm-progress-percent')).toBe('32%');
    expect(q('pfm-progress-done')?.contains(q('pfm-progress-percent'))).toBe(true);
    expect(q('pfm-progress-count')).toBeNull();
    const all = Array.from(q('pfm-progress-card')?.querySelectorAll('[data-testid]') ?? []);
    expect(all.indexOf(q('pfm-progress-legend')!)).toBeLessThan(all.indexOf(q('pfm-progress-bar')!));
    // Owner: no subtitle; the legend and the tooltips say what done means.
    expect(q('pfm-progress-message')).toBeNull();
    const legend = Array.from(q('pfm-progress-legend')!.children).map(c => c.textContent?.trim());
    expect(legend).toEqual(['Done: in PRMS or no SP contribution', 'Still to do']);
  });

  // Owner: in PRMS and no SP contribution are ONE total, not two pieces of the bar.
  it('the bar has two parts, done (one total) and still to do, each explained in its tooltip', () => {
    const { q, el } = render(counts(21, 113, 33));
    const parts = Array.from(q('pfm-progress-bar')!.children).map(c => c.getAttribute('data-testid'));
    expect(parts).toEqual(['pfm-progress-done', 'pfm-progress-left']);
    expect(q('pfm-progress-done')?.getAttribute('aria-label')).toBe('54 results done: 21 in PRMS and 33 with no SP contribution. Click to see the results synced with PRMS.');
    expect(q('pfm-progress-left')?.getAttribute('aria-label')).toBe('113 results still need action. Click to see them.');
    expect(q('pfm-progress-done')?.style.width).toBe(`${(54 / 167) * 100}%`);
    expect(el.querySelectorAll('button')).toHaveLength(2);
  });

  // Owner: the bar is clickable and opens the quick views.
  it('done opens Synced with PRMS and still to do opens Need attention', () => {
    const { fixture, q } = render(counts(21, 113, 33));
    const opened: string[] = [];
    fixture.componentInstance.open.subscribe(c => opened.push(c));
    q('pfm-progress-done')!.click();
    q('pfm-progress-left')!.click();
    expect(opened).toEqual(['synced', 'need_attention']);
  });

  it('done is the palette green', () => {
    const { fixture } = render(counts(21, 113, 33));
    expect(fixture.componentInstance.doneFill).toBe('var(--ac-state-done-fill)');
  });

  it('never shows 100% while something is still left (floors)', () => {
    const { text } = render(counts(999, 1));
    expect(text('pfm-progress-percent')).toBe('99%');
  });

  it('at 100% the bar is all done: no "still to do" part', () => {
    const { q, text } = render(counts(40, 0, 10));
    expect(text('pfm-progress-percent')).toBe('100%');
    expect(q('pfm-progress-left')).toBeNull();
  });

  it('a green part too thin for the label puts it just after, on the grey', () => {
    const { q, text } = render(counts(5, 95));
    expect(text('pfm-progress-percent')).toBe('5%');
    expect(q('pfm-progress-left')?.contains(q('pfm-progress-percent'))).toBe(true);
  });

  it('at 0% there is no done part, only the "still to do" part', () => {
    const { q, text } = render(counts(0, 10));
    expect(text('pfm-progress-percent')).toBe('0%');
    expect(q('pfm-progress-done')).toBeNull();
    expect(q('pfm-progress-left')).not.toBeNull();
  });

  it('nothing to report: the shared "Nothing yet" state, no figure, no bar', () => {
    const { q } = render(counts(0, 0));
    expect(q('pfm-empty-state')?.textContent?.trim()).toBe('Nothing yet');
    expect(q('pfm-progress-percent')).toBeNull();
    expect(q('pfm-progress-bar')).toBeNull();
  });

  it('updates when the counts change after the first render (KZ-015)', () => {
    const { fixture, text } = render(counts(0, 10));
    expect(text('pfm-progress-percent')).toBe('0%');
    fixture.componentRef.setInput('counts', counts(5, 5));
    fixture.detectChanges();
    expect(text('pfm-progress-percent')).toBe('50%');
  });
});
