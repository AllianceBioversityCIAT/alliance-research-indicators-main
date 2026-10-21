import { TestBed } from '@angular/core/testing';
import { PfmNextStepsCardComponent } from './pfm-next-steps-card.component';
import { PfmChip, PfmChipCounts } from '../../pfm.interfaces';

const COUNTS: PfmChipCounts = { all: 108, attention: 70, mapping: 32, ready: 31, prms_rejected: 7, synced: 17 };

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
  it('three actions with a verb and the quick-view count, which add up to Need attention', () => {
    const { q } = render();
    const value = (chip: string) => q('pfm-next-' + chip)?.querySelector('[data-testid="pfm-next-value"]')?.textContent?.trim();
    expect(q('pfm-next-mapping_incomplete')?.textContent).toContain('Finish the mapping');
    expect(q('pfm-next-ready_to_sync')?.textContent).toContain('Send to PRMS');
    expect(q('pfm-next-rejected')?.textContent).toContain('Fix and send again');
    expect([value('mapping_incomplete'), value('ready_to_sync'), value('rejected')]).toEqual(['32', '31', '7']);
    expect(32 + 31 + 7).toBe(COUNTS.attention);
  });

  it('a click opens the Results queue on that quick view', () => {
    const { q, opened } = render();
    q('pfm-next-mapping_incomplete')!.click();
    q('pfm-next-ready_to_sync')!.click();
    q('pfm-next-rejected')!.click();
    expect(opened).toEqual(['mapping_incomplete', 'ready_to_sync', 'rejected']);
  });

  it('an action with nothing to do is disabled and says so', () => {
    const { q, opened } = render({ ...COUNTS, prms_rejected: 0 });
    const btn = q('pfm-next-rejected')!;
    expect(btn.disabled).toBe(true);
    expect(btn.textContent).toContain('Nothing to do here.');
    btn.click();
    expect(opened).toEqual([]);
  });

  it('all done: one line, no cards', () => {
    const { q, el } = render({ ...COUNTS, mapping: 0, ready: 0, prms_rejected: 0, attention: 0 });
    expect(q('pfm-next-steps-done')?.textContent?.trim()).toBe('Nothing left to do on our side.');
    expect(el.querySelectorAll('button')).toHaveLength(0);
  });
});
