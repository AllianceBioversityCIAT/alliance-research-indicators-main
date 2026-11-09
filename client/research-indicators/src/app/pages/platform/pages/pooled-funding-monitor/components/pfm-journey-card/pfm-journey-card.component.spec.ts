import { TestBed } from '@angular/core/testing';
import { PfmJourneyCardComponent } from './pfm-journey-card.component';
import { PfmChip, PfmJourney } from '../../pfm.interfaces';

const JOURNEY: PfmJourney = {
  projects: { total: 10, with_results: 7, without_results: 3 },
  star: { draft: 20, submitted: 30, approved: 50 },
  answer: { not_answered: 10, contributes: 35, no_sp: 5 },
  mapping: { incomplete: 5, complete: 30 },
  sync: { ready: 12, synced: 18, rejected: 2 }
};

function render(stage = 0, scope: 'all' | 'mine' = 'all') {
  TestBed.configureTestingModule({ imports: [PfmJourneyCardComponent] });
  const fixture = TestBed.createComponent(PfmJourneyCardComponent);
  fixture.componentRef.setInput('journey', JOURNEY);
  fixture.componentRef.setInput('scope', scope);
  fixture.componentRef.setInput('stage', stage);
  fixture.detectChanges();
  const el = fixture.nativeElement as HTMLElement;
  const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
  const all = (id: string) => Array.from(el.querySelectorAll(`[data-testid="${id}"]`)).map(e => e.textContent?.trim());
  return { fixture, el, q, all };
}

describe('PfmJourneyCardComponent', () => {
  it('tells the story of the scope and how many results are finished or need an action', () => {
    const { q } = render();
    expect(q('pfm-journey-headline')?.textContent).toContain('Across the 10 bilateral projects mapped to the CGIAR portfolio, 100 results have been reported so far.');
    // finished = no SP 5 + synced 18 - rejected 2
    expect(q('pfm-journey-done')?.textContent?.trim()).toBe('21');
    // action = draft 20 + submitted 30 + not answered 10 + incomplete 5 + ready 12 + rejected 2
    expect(q('pfm-journey-action')?.textContent?.trim()).toBe('79');
  });

  it('speaks of "your" projects in the PI scope', () => {
    const { q } = render(0, 'mine');
    expect(q('pfm-journey-headline')?.textContent).toContain('Across your 10 bilateral projects');
  });

  it('shows the five stages, each with its own figure', () => {
    const { all } = render();
    expect(all('pfm-journey-stage-value')).toEqual(['10', '100', '50', '35', '30']);
  });

  it('each stage caption starts with a capital letter', () => {
    const { el } = render();
    const captions = Array.from(el.querySelectorAll('[data-testid^="pfm-journey-stage-"][role="tab"] > span:last-child')).map(e => e.textContent?.trim() ?? '');
    expect(captions).toEqual(['Bilateral projects', 'Results reported in STAR', 'Approved results to classify', 'Contributing results to map', 'Mapped results to sync']);
  });

  it('each stage splits its results and says what to do', () => {
    const cases: [number, string[], string[], string][] = [
      [0, ['Projects with results', 'Projects without results'], ['7', '3'], '3'],
      [1, ['Draft', 'Submitted', 'Approved'], ['20', '30', '50'], '50'],
      [2, ['Mapping not answered', 'Yes · contributes', 'No Science Program contribution'], ['10', '35', '5'], '10'],
      [3, ['Mapping incomplete', 'Mapping complete'], ['5', '30'], '5'],
      [4, ['Ready to sync', 'Synced'], ['12', '18'], '12']
    ];
    for (const [stage, labels, values, action] of cases) {
      TestBed.resetTestingModule();
      const { q, all } = render(stage);
      expect(q('pfm-journey-kicker')?.textContent?.trim()).toBe(`Stage ${stage + 1} of 5`);
      expect(all('pfm-journey-part-label')).toEqual(labels);
      expect(all('pfm-journey-part-value')).toEqual(values);
      expect(q('pfm-journey-action-value')?.textContent?.trim()).toBe(action);
    }
  });

  it('tags what still needs work apart from what moves on or is finished', () => {
    const { all } = render(2);
    expect(all('pfm-journey-part-tag')).toEqual(['Needs action', 'Moves on', 'Finished']);
  });

  it('the stepper and Previous / Next ask the tab for another stage', () => {
    const { fixture, q } = render(1);
    const stages: number[] = [];
    fixture.componentInstance.stageChange.subscribe(s => stages.push(s));
    q('pfm-journey-stage-4')!.click();
    q('pfm-journey-next')!.click();
    q('pfm-journey-prev')!.click();
    expect(stages).toEqual([3, 2, 0]);
  });

  it('Previous is off on the first stage and Next on the last', () => {
    expect((render(0).q('pfm-journey-prev') as HTMLButtonElement).disabled).toBe(true);
    TestBed.resetTestingModule();
    expect((render(4).q('pfm-journey-next') as HTMLButtonElement).disabled).toBe(true);
  });

  it('a stage action opens the Results queue on its quick view', () => {
    const expected: [number, PfmChip][] = [
      [1, 'awaiting_pi'],
      [2, 'mapping_incomplete'],
      [3, 'mapping_incomplete'],
      [4, 'ready_to_sync']
    ];
    for (const [stage, chip] of expected) {
      TestBed.resetTestingModule();
      const { fixture, q } = render(stage);
      const opened: PfmChip[] = [];
      fixture.componentInstance.openQueue.subscribe(c => opened.push(c));
      q('pfm-journey-cta')!.click();
      expect(opened).toEqual([chip]);
    }
  });

  it('the stage 1 action shows the projects without results instead of the queue', () => {
    const { fixture, q } = render(0);
    let shown = 0;
    const opened: PfmChip[] = [];
    fixture.componentInstance.showProjectsWithoutResults.subscribe(() => shown++);
    fixture.componentInstance.openQueue.subscribe(c => opened.push(c));
    q('pfm-journey-cta')!.click();
    expect(shown).toBe(1);
    expect(opened).toEqual([]);
  });

  it('says what comes next, and that the last stage is the last', () => {
    expect(render(0).q('pfm-journey-next-hint')?.textContent?.trim()).toBe('Next: Approve or reject results — 100 results created by 7 projects.');
    TestBed.resetTestingModule();
    expect(render(1).q('pfm-journey-next-hint')?.textContent?.trim()).toBe('Next: Define if it contributes to CGIAR — 50 results continue.');
    TestBed.resetTestingModule();
    expect(render(4).q('pfm-journey-next-hint')?.textContent?.trim()).toBe('Last step. Once PRMS approves them, synced results are complete.');
  });

  it('an empty scope shows zero shares instead of breaking', () => {
    TestBed.configureTestingModule({ imports: [PfmJourneyCardComponent] });
    const fixture = TestBed.createComponent(PfmJourneyCardComponent);
    fixture.componentRef.setInput('journey', {
      projects: { total: 0, with_results: 0, without_results: 0 },
      star: { draft: 0, submitted: 0, approved: 0 },
      answer: { not_answered: 0, contributes: 0, no_sp: 0 },
      mapping: { incomplete: 0, complete: 0 },
      sync: { ready: 0, synced: 0, rejected: 0 }
    });
    fixture.componentRef.setInput('scope', 'all');
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('NaN');
  });
});
