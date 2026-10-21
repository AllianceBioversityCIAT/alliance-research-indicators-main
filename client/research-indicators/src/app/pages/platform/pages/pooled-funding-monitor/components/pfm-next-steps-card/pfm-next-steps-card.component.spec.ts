import { TestBed } from '@angular/core/testing';
import { PfmNextStepsCardComponent } from './pfm-next-steps-card.component';
import { PfmChip, PfmChipCounts } from '../../pfm.interfaces';

const COUNTS: PfmChipCounts = { all: 167, attention: 113, mapping: 70, ready: 36, prms_rejected: 7, synced: 21, awaiting_pi: 45, no_sp: 33 };

function render(c: PfmChipCounts = COUNTS) {
  TestBed.configureTestingModule({ imports: [PfmNextStepsCardComponent] });
  const fixture = TestBed.createComponent(PfmNextStepsCardComponent);
  fixture.componentRef.setInput('counts', c);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLButtonElement | null;
  const opened: PfmChip[] = [];
  fixture.componentInstance.open.subscribe(x => opened.push(x));
  return { fixture, el, q, opened };
}

describe('PfmNextStepsCardComponent', () => {
  it('PI approval first, then the mapping, then the sync; no "Fix and send again"', () => {
    const { el, q } = render();
    const order = Array.from(el.querySelectorAll('[data-testid^="pfm-next-"]'))
      .map(b => b.getAttribute('data-testid'))
      .filter(id => !['pfm-next-value', 'pfm-next-steps-done', 'pfm-next-steps-card'].includes(id ?? ''));
    expect(order).toEqual(['pfm-next-awaiting_pi', 'pfm-next-mapping_incomplete', 'pfm-next-ready_to_sync']);
    expect(q('pfm-next-rejected')).toBeNull();
    expect(el.textContent).not.toContain('Fix and send again');
    const value = (chip: string) => q('pfm-next-' + chip)?.querySelector('[data-testid="pfm-next-value"]')?.textContent?.trim();
    expect(q('pfm-next-awaiting_pi')?.textContent).toContain('Pending approval by the PI');
    expect([value('awaiting_pi'), value('mapping_incomplete'), value('ready_to_sync')]).toEqual(['45', '70', '36']);
  });

  it('a click opens the Results queue on that view', () => {
    const { q, opened } = render();
    q('pfm-next-awaiting_pi')!.click();
    q('pfm-next-mapping_incomplete')!.click();
    q('pfm-next-ready_to_sync')!.click();
    expect(opened).toEqual(['awaiting_pi', 'mapping_incomplete', 'ready_to_sync']);
  });

  it('an action with nothing to do is disabled and says so (missing count from an older server reads as 0)', () => {
    const { awaiting_pi, ...older } = COUNTS;
    expect(awaiting_pi).toBe(45);
    const { q, opened } = render(older);
    const btn = q('pfm-next-awaiting_pi')!;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Nothing to do here.');
    btn.click();
    expect(opened).toEqual([]);
  });

  it('all done: one line, no cards', () => {
    const { q, el } = render({ ...COUNTS, mapping: 0, ready: 0, awaiting_pi: 0 });
    expect(el.querySelector('[data-testid="pfm-empty-state"]')?.textContent?.trim()).toBe('Nothing left to do on our side');
    expect(el.querySelectorAll('button')).toHaveLength(0);
  });

  it('no results at all: the shared "Nothing yet" state, no cards', () => {
    const { el } = render({ all: 0, attention: 0, mapping: 0, ready: 0, prms_rejected: 0, synced: 0, awaiting_pi: 0, no_sp: 0 });
    expect(el.querySelector('[data-testid="pfm-empty-state"]')?.textContent?.trim()).toBe('Nothing yet');
    expect(el.querySelectorAll('button')).toHaveLength(0);
  });
});
