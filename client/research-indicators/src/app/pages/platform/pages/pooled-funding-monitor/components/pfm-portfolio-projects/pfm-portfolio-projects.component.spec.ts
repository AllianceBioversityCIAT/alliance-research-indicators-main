import { By } from '@angular/platform-browser';
import { Tooltip } from 'primeng/tooltip';
import { TestBed } from '@angular/core/testing';
import { PfmPortfolioProjectsComponent } from './pfm-portfolio-projects.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { PfmPortfolioProject, PfmProjectDelegate } from '../../pfm.interfaces';

/** Name and email lines of a delegate chip, joined. */
const chipText = (chip: Element) => Array.from(chip.lastElementChild!.children).map(s => s.textContent?.trim()).join(' ');
const dlg = (name: string, is_active = true): PfmProjectDelegate => ({ name, email: name.split(' ')[0].toLowerCase() + '@cgiar.org', is_active });

const PROJECTS: PfmPortfolioProject[] = [
  { code: 'A357', name: 'Genetic improvement in Cassava', lead_pi: 'Newby, Jonathan', status: 'Ongoing', delegates: [dlg('Hernan Ceballos'), dlg('Luis Lopez', false), dlg('Ana Ruiz')], results: 4 },
  { code: 'A180', name: 'Biological nitrification inhibition', lead_pi: 'Arango, Jacobo', status: 'Completed', delegates: [], results: 1 },
  { code: 'D527', name: 'Iniciativas climaticamente inteligentes', lead_pi: 'Becerra, Luis', status: 'Suspended', delegates: [dlg('Marcela Quintero')], results: 0 },
  { code: 'ULZ53', name: 'Seeds of Life - East Timor', lead_pi: null, status: null, delegates: [], results: 0 }
];

describe('PfmPortfolioProjectsComponent', () => {
  let modals: { openModal: jest.Mock };
  let createResult: { setContractId: jest.Mock; setPresetFromProjectResultsTable: jest.Mock; setResultCreationEntryContext: jest.Mock };

  function render() {
    modals = { openModal: jest.fn() };
    createResult = { setContractId: jest.fn(), setPresetFromProjectResultsTable: jest.fn(), setResultCreationEntryContext: jest.fn() };
    TestBed.configureTestingModule({
      imports: [PfmPortfolioProjectsComponent],
      providers: [
        { provide: AllModalsService, useValue: modals },
        { provide: CreateResultManagementService, useValue: createResult }
      ]
    });
    const fixture = TestBed.createComponent(PfmPortfolioProjectsComponent);
    fixture.componentRef.setInput('projects', PROJECTS);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const q = (id: string) => el.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
    const codes = () => Array.from(el.querySelectorAll('[data-testid^="pfm-project-row-"]')).map(r => r.getAttribute('data-testid')!.replace('pfm-project-row-', ''));
    return { fixture, el, q, codes };
  }

  it('a clamped project name shows the full name in the PrimeNG tooltip, not the native title', () => {
    const { fixture, q } = render();
    q('pfm-projects-chip-all')!.click();
    fixture.detectChanges();
    const name = q('pfm-project-row-A357')!.querySelector('[data-testid="pfm-project-name"]') as HTMLElement;
    const tip = fixture.debugElement.queryAll(By.directive(Tooltip)).find(d => d.nativeElement === name);
    expect(name.getAttribute('title')).toBeNull();
    expect(tip?.injector.get(Tooltip).content).toBe('Genetic improvement in Cassava');
  });

  it('opens on the projects without results, the stage 1 action', () => {
    const { codes } = render();
    expect(codes()).toEqual(['D527', 'ULZ53']);
  });

  it('counts the projects of each chip and switches between them', () => {
    const { fixture, el, q, codes } = render();
    expect(Array.from(el.querySelectorAll('[data-testid="pfm-projects-chip-count"]')).map(e => e.textContent?.trim())).toEqual(['4', '2', '2']);
    q('pfm-projects-chip-with')!.click();
    fixture.detectChanges();
    expect(codes()).toEqual(['A357', 'A180']);
    q('pfm-projects-chip-all')!.click();
    fixture.detectChanges();
    expect(codes()).toEqual(['A357', 'A180', 'D527', 'ULZ53']);
  });

  it('finds a project by code, name or Principal Investigator; Clear Filters goes back to the start', () => {
    const { fixture, q, codes } = render();
    q('pfm-projects-chip-all')!.click();
    const input = q('pfm-projects-toolbar')!.querySelector('input') as HTMLInputElement;
    input.value = 'becerra';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(codes()).toEqual(['D527']);
    (Array.from(q('pfm-projects-toolbar')!.querySelectorAll('button')).find(b => b.textContent?.includes('Clear Filters')) as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(fixture.componentInstance.search()).toBe('');
    expect(codes()).toEqual(['D527', 'ULZ53']);
  });

  it('shows each delegate as My PI Delegates does, name over email, and a dash when the project has none', () => {
    const { fixture, q, el } = render();
    q('pfm-projects-chip-all')!.click();
    fixture.detectChanges();
    const delegates = Array.from(el.querySelectorAll('[data-testid="pfm-project-delegates"]')).map(cell =>
      cell.querySelectorAll('[data-testid="pfm-project-delegate"]').length
        ? Array.from(cell.querySelectorAll('[data-testid="pfm-project-delegate"]')).map(c => chipText(c))
        : [cell.textContent?.trim()]
    );
    expect(delegates).toEqual([['Hernan Ceballos hernan@cgiar.org', 'Luis Lopez luis@cgiar.org'], ['—'], ['Marcela Quintero marcela@cgiar.org'], ['—']]);
    expect(el.querySelector('[data-testid="pfm-project-delegates"] .pi-times')).toBeNull();
  });

  it('marks an inactive delegate the way My PI Delegates does', () => {
    const { fixture, q, el } = render();
    q('pfm-projects-chip-all')!.click();
    fixture.detectChanges();
    const chips = el.querySelectorAll('[data-testid="pfm-project-row-A357"] [data-testid="pfm-project-delegate"]');
    expect(chips[0].querySelector('.pi-exclamation-circle')).toBeNull();
    expect(chips[1].getAttribute('aria-label')).toBe('Luis Lopez (inactive) (luis@cgiar.org)');
    expect(chips[1].querySelector('.pi-exclamation-circle')).not.toBeNull();
  });

  it('puts the delegates beyond the visible ones behind "+N more", which lists them all', () => {
    const { fixture, q, el } = render();
    q('pfm-projects-chip-all')!.click();
    fixture.detectChanges();
    const row = () => el.querySelector('[data-testid="pfm-project-row-A357"]')!;
    const more = row().querySelector<HTMLButtonElement>('[data-testid="pfm-project-delegates-more"]')!;
    expect(more.textContent?.trim()).toBe('+1 more');
    expect(row().querySelector('[data-testid="pfm-project-delegates-all"]')).toBeNull();
    more.click();
    fixture.detectChanges();
    const all = document.querySelector('[data-testid="pfm-project-delegates-all"]')!;
    expect(Array.from(all.querySelectorAll('[data-testid="pfm-project-delegate"]')).map(c => chipText(c))).toEqual([
      'Hernan Ceballos hernan@cgiar.org',
      'Luis Lopez luis@cgiar.org',
      'Ana Ruiz ana@cgiar.org'
    ]);
  });

  it('shows the My Projects status tag from the contract status, after Project Name', () => {
    const { fixture, q, el } = render();
    q('pfm-projects-chip-all')!.click();
    fixture.detectChanges();
    const status = Array.from(el.querySelectorAll('[data-testid="pfm-project-status"]')).map(c => c.textContent?.trim());
    // No contract status falls back to Ongoing, as on My Projects
    expect(status).toEqual(['Ongoing', 'Completed', 'Suspended', 'Ongoing']);
    const headers = Array.from(el.querySelectorAll('th')).map(th => th.textContent?.trim());
    expect(headers.slice(0, 3)).toEqual(['Code', 'Project Name', 'Status']);
  });

  it('rows use the Results queue text size', () => {
    const { fixture, q, el } = render();
    q('pfm-projects-chip-all')!.click();
    fixture.detectChanges();
    expect(el.querySelector('[data-testid="pfm-project-row-A357"]')!.classList).toContain('text-[14px]');
  });

  it('Create Result opens the create-result modal on that project', () => {
    const { q } = render();
    q('pfm-project-create-D527')!.querySelector('button')!.click();
    expect(createResult.setContractId).toHaveBeenCalledWith('D527');
    expect(createResult.setPresetFromProjectResultsTable).toHaveBeenCalledWith(true);
    expect(createResult.setResultCreationEntryContext).toHaveBeenCalledWith('project');
    expect(modals.openModal).toHaveBeenCalledWith('createResult');
  });

  it('leaving the table clears the project preset', () => {
    const { fixture } = render();
    fixture.destroy();
    expect(createResult.setContractId).toHaveBeenLastCalledWith(null);
    expect(createResult.setPresetFromProjectResultsTable).toHaveBeenLastCalledWith(false);
  });

  it('uses the Results Center table: shared search, sortable headers, paginator on the right', () => {
    const { q, el } = render();
    expect(q('pfm-projects-toolbar')!.querySelector('app-search-export-controls')).not.toBeNull();
    expect(Array.from(el.querySelectorAll('[data-testid^="pfm-projects-col-"]')).map(th => th.textContent?.trim())).toEqual([
      'Code',
      'Project Name',
      'Status',
      'Principal Investigator',
      'PI Delegates',
      'Results'
    ]);
    expect(el.querySelectorAll('p-sorticon, p-sortIcon').length).toBe(6);
  });

  it('the quick views are one choice: arrows move it', () => {
    const { fixture, q, codes } = render();
    const without = q('pfm-projects-chip-without')!;
    expect(without.getAttribute('role')).toBe('radio');
    expect(without.getAttribute('aria-checked')).toBe('true');
    without.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    fixture.detectChanges();
    expect(q('pfm-projects-chip-all')!.getAttribute('aria-checked')).toBe('true');
    expect(codes()).toEqual(['A357', 'A180', 'D527', 'ULZ53']);
  });

  it('says so when no project matches', () => {
    const { fixture, q } = render();
    const input = q('pfm-projects-toolbar')!.querySelector('input') as HTMLInputElement;
    input.value = 'nothing like this';
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();
    expect(q('pfm-projects-empty')?.textContent?.trim()).toBe('No projects match these filters');
  });
});
