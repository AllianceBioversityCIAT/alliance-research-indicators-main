import { TestBed } from '@angular/core/testing';
import { PfmAllianceSideCardComponent, PFM_BEHIND_LIMIT } from './pfm-alliance-side-card.component';
import { PfmPipeline, PfmProjectProgress } from '../../pfm.interfaces';

const PIPELINE: PfmPipeline = {
  total: 30,
  in_scope: 27,
  not_synced: 18,
  in_prms: 9,
  out_of_scope: 3,
  stages: [
    { key: 'mapping_not_started', group: 'in_star', value: 8 },
    { key: 'mapping_incomplete', group: 'in_star', value: 6 },
    { key: 'ready_to_sync', group: 'in_star', value: 4 },
    { key: 'pending_review', group: 'in_prms', value: 3 },
    { key: 'approved', group: 'in_prms', value: 4 },
    { key: 'rejected', group: 'in_prms', value: 2 },
    { key: 'no_sp_contribution', group: 'out_of_scope', value: 3 }
  ]
};

const proj = (code: string, total: number, done: number, ready = 0, lead: string | null = `PI ${code}`): PfmProjectProgress => ({
  code,
  name: `Project ${code}`,
  lead_pi: lead,
  total,
  done,
  remaining: total - done,
  to_map: total - done - ready,
  ready,
  in_prms: done,
  out_of_scope: 0,
  pending_review: done,
  approved: 0,
  rejected: 0
});

function render(projects: PfmProjectProgress[]) {
  TestBed.configureTestingModule({ imports: [PfmAllianceSideCardComponent] });
  const fixture = TestBed.createComponent(PfmAllianceSideCardComponent);
  fixture.componentRef.setInput('pipeline', PIPELINE);
  fixture.componentRef.setInput('projects', projects);
  fixture.componentRef.setInput('scope', 'all');
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  return { fixture, el, q };
}

describe('PfmAllianceSideCardComponent', () => {
  it('splits our side into the five states, which add up to every result', () => {
    const { fixture } = render([]);
    const segs = fixture.componentInstance.segments();
    expect(segs.map(s => [s.key, s.value, s.state])).toEqual([
      ['mapping_pending', 8, 'todo'],
      ['mapping_incomplete', 6, 'progress'],
      ['ready_to_sync', 4, 'ready'],
      ['synced', 9, 'done'],
      ['out_of_scope', 3, 'out']
    ]);
    expect(segs.reduce((a, s) => a + s.value, 0)).toBe(PIPELINE.total);
    expect(segs.every(s => s.help.length > 10)).toBe(true);
  });

  it('lists the projects furthest behind, in server order, with whom to contact, capped', () => {
    const many = ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((c, i) => proj(c, 10, i));
    const { el, q } = render(many);
    const rows = Array.from(el.querySelectorAll('[data-testid^="pfm-behind-"]')).filter(e => /pfm-behind-[A-Z]$/.test(e.getAttribute('data-testid')!));
    expect(rows).toHaveLength(PFM_BEHIND_LIMIT);
    expect(q('pfm-behind-A')?.querySelector('[data-testid="pfm-behind-left"]')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('10 left of 10');
    expect(q('pfm-behind-A')?.querySelector('[data-testid="pfm-behind-pi"]')?.textContent).toContain('Contact: PI A');
    expect(q('pfm-behind-F')).toBeNull();
  });

  it('a project with nothing left is not "behind"; no Lead PI is said out loud', () => {
    const { q } = render([proj('X', 5, 5), proj('Y', 5, 1, 0, null)]);
    expect(q('pfm-behind-X')).toBeNull();
    expect(q('pfm-behind-Y')?.textContent).toContain('No Lead PI on record');
  });

  it('counts started vs. not started projects (started = something mapped, sent or settled)', () => {
    const { q } = render([proj('A', 5, 0), proj('B', 5, 0, 2), proj('C', 5, 3)]);
    expect(q('pfm-alliance-started')?.textContent?.replace(/\s+/g, ' ').trim()).toBe('2 of 3 projects have started · 1 not started yet');
  });

  it('nothing pending says so', () => {
    const { q } = render([proj('X', 5, 5)]);
    expect(q('pfm-alliance-behind-empty')?.textContent?.trim()).toBe('Nothing pending on our side.');
  });
});
