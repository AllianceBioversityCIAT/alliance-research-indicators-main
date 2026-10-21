import { TestBed } from '@angular/core/testing';
import { PfmProgressCardComponent } from './pfm-progress-card.component';
import { PfmChip, PfmChipCounts } from '../../pfm.interfaces';

const counts = (synced: number, attention: number): PfmChipCounts => ({ all: synced + attention, attention, mapping: 0, ready: 0, prms_rejected: 0, synced });

function render(c: PfmChipCounts, outOfScope = 0, scope: 'all' | 'mine' = 'mine') {
  TestBed.configureTestingModule({ imports: [PfmProgressCardComponent] });
  const fixture = TestBed.createComponent(PfmProgressCardComponent);
  fixture.componentRef.setInput('counts', c);
  fixture.componentRef.setInput('outOfScope', outOfScope);
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
  it('a big percentage badge and one bar; no separate buttons with text', () => {
    const { q, text, el } = render(counts(17, 70), 21);
    expect(text('pfm-progress-percent')).toBe('19%');
    expect(text('pfm-progress-message')).toBe('Share of the results of your projects already in PRMS. Click the bar to see them.');
    expect(text('pfm-progress-open-synced')).toBe('');
    expect(text('pfm-progress-open-attention')).toBe('');
    expect(el.textContent).not.toContain('need action');
    expect(text('pfm-progress-out')).toBe('21 out of scope · no action needed');
    expect(q('pfm-progress-marker')).not.toBeNull();
  });

  it('the bar is the click target: the filled part opens Synced, the rest opens Need attention', () => {
    const { q, opened } = render(counts(17, 70));
    q('pfm-progress-open-synced')!.click();
    q('pfm-progress-open-attention')!.click();
    expect(opened).toEqual(['synced', 'need_attention']);
  });

  it('each part of the bar explains itself (tooltip + accessible name)', () => {
    const { q } = render(counts(17, 70));
    expect(q('pfm-progress-open-synced')?.getAttribute('aria-label')).toBe('17 results in PRMS. Click to see them.');
    expect(q('pfm-progress-open-attention')?.getAttribute('aria-label')).toBe('70 results need action. Click to see them.');
    expect(q('pfm-progress-open-synced')?.style.width).toBe(`${(17 / 87) * 100}%`);
  });

  it('never shows 100% while something is still left (floors)', () => {
    const { text } = render(counts(999, 1));
    expect(text('pfm-progress-percent')).toBe('99%');
  });

  it('at 100% the bar is all filled: no "need action" part and no marker', () => {
    const { q, text } = render(counts(40, 0), 0, 'all');
    expect(text('pfm-progress-percent')).toBe('100%');
    expect(text('pfm-progress-message')).toBe('Everything for all contributing projects is in PRMS.');
    expect(q('pfm-progress-open-attention')).toBeNull();
    expect(q('pfm-progress-marker')).toBeNull();
    expect(q('pfm-progress-out')).toBeNull();
  });

  it('at 0% there is no filled part and no marker, only the "need action" part', () => {
    const { q, text } = render(counts(0, 10));
    expect(text('pfm-progress-percent')).toBe('0%');
    expect(q('pfm-progress-open-synced')).toBeNull();
    expect(q('pfm-progress-marker')).toBeNull();
    expect(q('pfm-progress-open-attention')).not.toBeNull();
  });

  it('nothing to report: 0%, no division by zero, nothing to click', () => {
    const { q, text } = render(counts(0, 0));
    expect(text('pfm-progress-percent')).toBe('0%');
    expect(text('pfm-progress-message')).toBe('Nothing to report yet for your projects.');
    expect(q('pfm-progress-open-synced')).toBeNull();
    expect(q('pfm-progress-open-attention')).toBeNull();
  });

  it('updates when the counts change after the first render (KZ-015)', () => {
    const { fixture, text } = render(counts(0, 10));
    expect(text('pfm-progress-percent')).toBe('0%');
    fixture.componentRef.setInput('counts', counts(5, 5));
    fixture.detectChanges();
    expect(text('pfm-progress-percent')).toBe('50%');
  });
});
