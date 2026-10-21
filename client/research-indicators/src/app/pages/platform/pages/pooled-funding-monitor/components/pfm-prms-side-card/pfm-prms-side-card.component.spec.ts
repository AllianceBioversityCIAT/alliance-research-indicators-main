import { TestBed } from '@angular/core/testing';
import { PfmPrmsSideCardComponent } from './pfm-prms-side-card.component';
import { PfmPipeline, PfmProjectProgress, PfmRejectionReason } from '../../pfm.interfaces';

const pipe = (pending: number, approved: number, rejected: number): PfmPipeline => ({
  total: 50,
  in_scope: 50,
  not_synced: 50 - pending - approved - rejected,
  in_prms: pending + approved + rejected,
  out_of_scope: 0,
  stages: [
    { key: 'pending_review', group: 'in_prms', value: pending },
    { key: 'approved', group: 'in_prms', value: approved },
    { key: 'rejected', group: 'in_prms', value: rejected }
  ]
});

const proj = (code: string, rejected: number): PfmProjectProgress => ({
  code,
  name: `Project ${code}`,
  lead_pi: `PI ${code}`,
  total: 10,
  done: rejected,
  remaining: 10 - rejected,
  to_map: 10 - rejected,
  ready: 0,
  in_prms: rejected,
  out_of_scope: 0,
  pending_review: 0,
  approved: 0,
  rejected
});

function render(p: PfmPipeline, projects: PfmProjectProgress[] = [], reasons: PfmRejectionReason[] = []) {
  TestBed.configureTestingModule({ imports: [PfmPrmsSideCardComponent] });
  const fixture = TestBed.createComponent(PfmPrmsSideCardComponent);
  fixture.componentRef.setInput('pipeline', p);
  fixture.componentRef.setInput('projects', projects);
  fixture.componentRef.setInput('reasons', reasons);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  return { fixture, el, q: (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null };
}

describe('PfmPrmsSideCardComponent', () => {
  it('splits what we sent into pending review / approved / rejected (waiting, done, alert)', () => {
    const { fixture } = render(pipe(3, 4, 2));
    expect(fixture.componentInstance.segments().map(s => [s.key, s.value, s.state])).toEqual([
      ['pending_review', 3, 'waiting'],
      ['approved', 4, 'done'],
      ['rejected', 2, 'alert']
    ]);
    expect(fixture.componentInstance.sent()).toBe(9);
  });

  it('shows why PRMS rejected, most frequent first, capped with "and N more"', () => {
    const reasons = ['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((r, i) => ({ reason: `Reason ${r}`, count: 7 - i }));
    const { el, q } = render(pipe(0, 0, 28), [], reasons);
    const items = Array.from(el.querySelectorAll('[data-testid="pfm-prms-reason"]')).map(e =>
      Array.from(e.children).map(c => c.textContent?.trim()).join(' | ')
    );
    expect(items).toEqual(['Reason a | 7', 'Reason b | 6', 'Reason c | 5', 'Reason d | 4', 'Reason e | 3']);
    expect(q('pfm-prms-card')?.textContent).toContain('and 2 more reasons');
  });

  it('lists the projects with rejections, most first, with whom to contact', () => {
    const { el } = render(pipe(0, 0, 6), [proj('B', 1), proj('A', 3), proj('C', 0), proj('D', 3)]);
    const rows = Array.from(el.querySelectorAll('[data-testid^="pfm-prms-project-"]')).map(e => e.getAttribute('data-testid'));
    expect(rows).toEqual(['pfm-prms-project-A', 'pfm-prms-project-D', 'pfm-prms-project-B']);
    expect(el.querySelector('[data-testid="pfm-prms-project-A"]')?.textContent).toContain('Contact: PI A');
  });

  it('nothing sent yet: one plain message, no empty chart', () => {
    const { q } = render(pipe(0, 0, 0));
    expect(q('pfm-prms-empty')?.textContent?.trim()).toBe('Nothing sent to PRMS yet.');
    expect(q('pfm-state-bar')).toBeNull();
  });

  it('sent but nothing rejected says so', () => {
    const { q } = render(pipe(2, 1, 0));
    expect(q('pfm-prms-reasons-empty')?.textContent?.trim()).toBe('No rejections.');
    expect(q('pfm-prms-projects')).toBeNull();
  });
});
