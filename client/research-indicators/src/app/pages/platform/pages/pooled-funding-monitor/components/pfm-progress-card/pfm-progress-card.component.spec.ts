import { TestBed } from '@angular/core/testing';
import { PfmProgressCardComponent } from './pfm-progress-card.component';
import { PfmChipCounts } from '../../pfm.interfaces';

const counts = (synced: number, attention: number, noSp = 0): PfmChipCounts => ({ all: synced + attention + noSp, attention, mapping: 0, ready: 0, prms_rejected: 0, synced, no_sp: noSp });

function render(c: PfmChipCounts, scope: 'all' | 'mine' = 'mine') {
  TestBed.configureTestingModule({ imports: [PfmProgressCardComponent] });
  const fixture = TestBed.createComponent(PfmProgressCardComponent);
  fixture.componentRef.setInput('counts', c);
  fixture.componentRef.setInput('scope', scope);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const text = (id: string) => q(id)?.textContent?.replace(/\s+/g, ' ').trim();
  return { fixture, el, q, text };
}

describe('PfmProgressCardComponent', () => {
  it('done = in PRMS + no SP contribution, over every result: the figure, the count and a dot legend', () => {
    const { q, text } = render(counts(21, 113, 33));
    // (21 + 33) / 167
    expect(text('pfm-progress-percent')).toBe('32%');
    expect(text('pfm-progress-count')).toBe('54 of 167 results done');
    expect(text('pfm-progress-message')).toBe('Results of your projects already done: in PRMS or with no SP contribution.');
    const legend = Array.from(q('pfm-progress-legend')!.children).map(c => c.textContent?.trim());
    expect(legend).toEqual(['Done: in PRMS or no SP contribution', 'Still to do']);
  });

  // Owner: in PRMS and no SP contribution are ONE total, not two pieces of the bar.
  it('the bar has two parts, done (one total) and still to do, each explained in its tooltip only', () => {
    const { q, el } = render(counts(21, 113, 33));
    const parts = Array.from(q('pfm-progress-bar')!.children).map(c => c.getAttribute('data-testid'));
    expect(parts).toEqual(['pfm-progress-done', 'pfm-progress-left']);
    expect(q('pfm-progress-done')?.getAttribute('aria-label')).toBe('54 results done: 21 in PRMS and 33 with no SP contribution.');
    expect(q('pfm-progress-left')?.getAttribute('aria-label')).toBe('113 results still need action.');
    expect(q('pfm-progress-done')?.style.width).toBe(`${(54 / 167) * 100}%`);
    expect(el.querySelectorAll('button')).toHaveLength(0);
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
    const { q, text } = render(counts(40, 0, 10), 'all');
    expect(text('pfm-progress-percent')).toBe('100%');
    expect(text('pfm-progress-message')).toBe('Everything for all contributing projects is done: in PRMS or with no SP contribution.');
    expect(q('pfm-progress-left')).toBeNull();
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
