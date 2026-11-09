import { TestBed } from '@angular/core/testing';
import { PfmPortfolioProjectsComponent } from './pfm-portfolio-projects.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { PfmPortfolioProject } from '../../pfm.interfaces';

const PROJECTS: PfmPortfolioProject[] = [
  { code: 'A357', name: 'Genetic improvement in Cassava', lead_pi: 'NEWBY, JONATHAN', delegates: ['CEBALLOS, HERNAN', 'LOPEZ, LUIS'], results: 4 },
  { code: 'A180', name: 'Biological nitrification inhibition', lead_pi: 'ARANGO, JACOBO', delegates: [], results: 1 },
  { code: 'D527', name: 'Iniciativas climaticamente inteligentes', lead_pi: 'BECERRA, LUIS', delegates: ['QUINTERO, MARCELA'], results: 0 },
  { code: 'ULZ53', name: 'Seeds of Life - East Timor', lead_pi: null, delegates: [], results: 0 }
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

  it('lists every delegate, and a dash when the project has none', () => {
    const { fixture, q, el } = render();
    q('pfm-projects-chip-all')!.click();
    fixture.detectChanges();
    const delegates = Array.from(el.querySelectorAll('[data-testid="pfm-project-delegates"]')).map(cell =>
      Array.from(cell.querySelectorAll('span')).map(s => s.textContent?.trim())
    );
    expect(delegates).toEqual([['CEBALLOS, HERNAN', 'LOPEZ, LUIS'], ['—'], ['QUINTERO, MARCELA'], ['—']]);
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
      'Principal Investigator',
      'PI Delegates',
      'Results'
    ]);
    expect(el.querySelectorAll('p-sorticon, p-sortIcon').length).toBe(5);
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
