import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Tooltip } from 'primeng/tooltip';
import { PfmPrmsStatusCardComponent } from './pfm-prms-status-card.component';
import { PfmChip, PfmPipeline } from '../../pfm.interfaces';

const pipe = (approved: number, pending: number, rejected: number, noSp: number): PfmPipeline => ({
  total: 200,
  in_scope: 200 - noSp,
  not_synced: 0,
  in_prms: approved + pending + rejected,
  out_of_scope: noSp,
  stages: [
    { key: 'mapping_not_started', group: 'in_star', value: 99 },
    { key: 'ready_to_sync', group: 'in_star', value: 40 },
    { key: 'pending_review', group: 'in_prms', value: pending },
    { key: 'approved', group: 'in_prms', value: approved },
    { key: 'rejected', group: 'in_prms', value: rejected },
    { key: 'no_sp_contribution', group: 'out_of_scope', value: noSp }
  ]
});

function render(p: PfmPipeline) {
  TestBed.configureTestingModule({ imports: [PfmPrmsStatusCardComponent] });
  const fixture = TestBed.createComponent(PfmPrmsStatusCardComponent);
  fixture.componentRef.setInput('pipeline', p);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const opened: PfmChip[] = [];
  fixture.componentInstance.open.subscribe(c => opened.push(c));
  return { fixture, el, q, opened };
}

describe('PfmPrmsStatusCardComponent', () => {
  it('the middle is the total in PRMS plus no SP contribution (STAR stages left out)', () => {
    const { q } = render(pipe(13, 8, 7, 33));
    expect(q('pfm-prms-total')?.textContent?.trim()).toBe('61');
  });

  // Owner: compact legend — category only; count and share in the tooltip.
  it('legend shows only the categories; count and share are in its tooltip', () => {
    const { el, fixture } = render(pipe(13, 8, 7, 33));
    const rows = Array.from(el.querySelectorAll('[data-testid="pfm-prms-legend"] button'));
    expect(rows.map(r => r.textContent?.trim())).toEqual(['Approved by PRMS', 'Pending review in PRMS', 'Rejected by PRMS', 'No SP contribution']);
    expect(el.querySelector('[data-testid="pfm-prms-legend-value"]')).toBeNull();
    const tips = fixture.debugElement
      .queryAll(By.directive(Tooltip))
      .filter(d => el.querySelector('[data-testid="pfm-prms-legend"]')!.contains(d.nativeElement))
      .map(d => d.injector.get(Tooltip).content);
    expect(tips).toEqual([
      'Approved by PRMS: 13 results (21%)',
      'Pending review in PRMS: 8 results (13%)',
      'Rejected by PRMS: 7 results (11%)',
      'No SP contribution: 33 results (54%)'
    ]);
  });

  it('slices are sized by share and use the shared palette', () => {
    const { fixture } = render(pipe(13, 8, 7, 33));
    const items = fixture.componentInstance.slices().items;
    expect(items.map(i => i.fill)).toEqual(['var(--ac-status-prms-approved)', 'var(--ac-status-prms-pending)', 'var(--ac-status-prms-rejected)', 'var(--ac-status-mapping-no-sp)']);
    const C = fixture.componentInstance.circumference;
    const len = (i: number) => Number(items[i].dash.split(' ')[0]);
    expect(len(0) + len(1) + len(2) + len(3)).toBeCloseTo(C, 6);
    expect(len(3)).toBeCloseTo((33 / 61) * C, 6);
  });

  it('every slice and legend row opens the queue on exactly those results', () => {
    const { q, opened } = render(pipe(13, 8, 7, 33));
    for (const k of ['approved', 'pending_review', 'rejected', 'no_sp']) q('pfm-prms-slice-' + k)!.dispatchEvent(new MouseEvent('click'));
    expect(opened).toEqual(['prms_approved', 'prms_pending', 'rejected', 'no_sp_contribution']);
    q('pfm-prms-legend-rejected')!.click();
    expect(opened.at(-1)).toBe('rejected');
  });

  it('slices use the STAR tooltip', () => {
    const { fixture } = render(pipe(13, 8, 7, 33));
    const tips = fixture.debugElement.queryAll(By.directive(Tooltip)).map(d => d.injector.get(Tooltip).content);
    expect(tips).toContain('No SP contribution: 33 (54%). Click to see them.');
  });

  it('a zero slice is not drawn and its legend row is disabled', () => {
    const { q } = render(pipe(13, 8, 0, 33));
    expect(q('pfm-prms-slice-rejected')).toBeNull();
    expect((q('pfm-prms-legend-rejected') as HTMLButtonElement).disabled).toBe(true);
  });

  it('nothing in PRMS yet: the shared "Nothing yet" state, no donut', () => {
    const { q } = render(pipe(0, 0, 0, 0));
    expect(q('pfm-empty-state')?.textContent?.trim()).toBe('Nothing yet');
    expect(q('pfm-prms-donut')).toBeNull();
  });
});
