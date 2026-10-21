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
  it('one big percentage of what is in PRMS, and the two numbers as buttons', () => {
    const { text } = render(counts(17, 70), 21);
    expect(text('pfm-progress-percent')).toBe('19%');
    expect(text('pfm-progress-message')).toBe('of the results of your projects are in PRMS');
    expect(text('pfm-progress-open-synced')).toBe('17 in PRMS');
    expect(text('pfm-progress-open-attention')).toBe('70 need action');
    expect(text('pfm-progress-out')).toBe('21 out of scope · no action needed');
  });

  it('each number opens the Results queue on its quick view', () => {
    const { q, opened } = render(counts(17, 70));
    q('pfm-progress-open-synced')!.click();
    q('pfm-progress-open-attention')!.click();
    expect(opened).toEqual(['synced', 'need_attention']);
  });

  it('is one bar only, exposed as a progressbar', () => {
    const { q } = render(counts(17, 70));
    const bar = q('pfm-progress-bar')!;
    expect(bar.children).toHaveLength(1);
    expect(bar.getAttribute('role')).toBe('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('17');
    expect(bar.getAttribute('aria-valuemax')).toBe('87');
  });

  it('never shows 100% while something is still left (floors)', () => {
    const { text } = render(counts(999, 1));
    expect(text('pfm-progress-percent')).toBe('99%');
  });

  it('at 100% says everything is in PRMS and offers no "need action"', () => {
    const { q, text } = render(counts(40, 0), 0, 'all');
    expect(text('pfm-progress-percent')).toBe('100%');
    expect(text('pfm-progress-message')).toBe('Everything for all contributing projects is in PRMS.');
    expect(q('pfm-progress-open-attention')).toBeNull();
    expect(q('pfm-progress-out')).toBeNull();
  });

  it('nothing to report: 0%, no division by zero', () => {
    const { q, text } = render(counts(0, 0));
    expect(text('pfm-progress-percent')).toBe('0%');
    expect(text('pfm-progress-message')).toBe('Nothing to report yet for your projects.');
    expect(q('pfm-progress-fill')?.style.width).toBe('0%');
  });

  it('updates when the counts change after the first render (KZ-015)', () => {
    const { fixture, text } = render(counts(0, 10));
    expect(text('pfm-progress-percent')).toBe('0%');
    fixture.componentRef.setInput('counts', counts(5, 5));
    fixture.detectChanges();
    expect(text('pfm-progress-percent')).toBe('50%');
  });
});
