import { TestBed } from '@angular/core/testing';
import { PfmProgressCardComponent } from './pfm-progress-card.component';
import { PfmChip, PfmChipCounts } from '../../pfm.interfaces';

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
  const opened: PfmChip[] = [];
  fixture.componentInstance.open.subscribe(c => opened.push(c));
  return { fixture, el, q, text, opened };
}

describe('PfmProgressCardComponent', () => {
  it('done = in PRMS + no SP contribution, over every result; a big badge and one bar, no buttons with text', () => {
    const { q, text, el } = render(counts(21, 113, 33));
    // (21 + 33) / 167
    expect(text('pfm-progress-percent')).toBe('32%');
    expect(text('pfm-progress-message')).toBe('Results of your projects already done: in PRMS or with no SP contribution. Click the bar to see them.');
    for (const id of ['pfm-progress-open-synced', 'pfm-progress-open-no-sp', 'pfm-progress-open-attention']) expect(text(id)).toBe('');
    expect(q('pfm-progress-marker')).toBeNull();
    expect(el.textContent).not.toContain('out of scope · no action needed');
  });

  it('the bar is the click target: Synced, No SP contribution and Need attention parts, in that order', () => {
    const { q, opened, el } = render(counts(21, 113, 33));
    const ids = Array.from(el.querySelectorAll('[data-testid^="pfm-progress-open-"]')).map(b => b.getAttribute('data-testid'));
    expect(ids).toEqual(['pfm-progress-open-synced', 'pfm-progress-open-no-sp', 'pfm-progress-open-attention']);
    q('pfm-progress-open-synced')!.click();
    q('pfm-progress-open-no-sp')!.click();
    q('pfm-progress-open-attention')!.click();
    expect(opened).toEqual(['synced', 'no_sp_contribution', 'need_attention']);
  });

  it('each part explains itself and is sized by its share of every result', () => {
    const { q } = render(counts(21, 113, 33));
    expect(q('pfm-progress-open-synced')?.getAttribute('aria-label')).toBe('21 results in PRMS. Click to see them.');
    expect(q('pfm-progress-open-no-sp')?.getAttribute('aria-label')).toBe('33 results with no SP contribution: nothing to do. Click to see them.');
    expect(q('pfm-progress-open-attention')?.getAttribute('aria-label')).toBe('113 results need action. Click to see them.');
    expect(q('pfm-progress-open-synced')?.style.width).toBe(`${(21 / 167) * 100}%`);
    expect(q('pfm-progress-open-no-sp')?.style.width).toBe(`${(33 / 167) * 100}%`);
  });

  // Owner: one colour for done — in PRMS and no SP contribution look the same (green).
  it('both done parts share the palette green; the rest is the empty track', () => {
    const { fixture } = render(counts(21, 113, 33));
    const parts = fixture.componentInstance.progress().parts;
    expect(parts.map(p => p.color)).toEqual(['var(--ac-state-done-fill)', 'var(--ac-state-done-fill)', null]);
  });

  it('never shows 100% while something is still left (floors)', () => {
    const { text } = render(counts(999, 1));
    expect(text('pfm-progress-percent')).toBe('99%');
  });

  it('at 100% the bar is all done: no "need action" part', () => {
    const { q, text } = render(counts(40, 0, 10), 'all');
    expect(text('pfm-progress-percent')).toBe('100%');
    expect(text('pfm-progress-message')).toBe('Everything for all contributing projects is done: in PRMS or with no SP contribution.');
    expect(q('pfm-progress-open-attention')).toBeNull();
  });

  it('at 0% there is no done part, only the "need action" part', () => {
    const { q, text } = render(counts(0, 10));
    expect(text('pfm-progress-percent')).toBe('0%');
    expect(q('pfm-progress-open-synced')).toBeNull();
    expect(q('pfm-progress-open-no-sp')).toBeNull();
    expect(q('pfm-progress-open-attention')).not.toBeNull();
  });

  it('nothing to report: the shared "Nothing yet" state, no badge, no bar, nothing to click', () => {
    const { el, q } = render(counts(0, 0));
    expect(q('pfm-empty-state')?.textContent?.trim()).toBe('Nothing yet');
    expect(q('pfm-progress-percent')).toBeNull();
    expect(q('pfm-progress-bar')).toBeNull();
    expect(el.querySelectorAll('button')).toHaveLength(0);
  });

  it('updates when the counts change after the first render (KZ-015)', () => {
    const { fixture, text } = render(counts(0, 10));
    expect(text('pfm-progress-percent')).toBe('0%');
    fixture.componentRef.setInput('counts', counts(5, 5));
    fixture.detectChanges();
    expect(text('pfm-progress-percent')).toBe('50%');
  });
});
