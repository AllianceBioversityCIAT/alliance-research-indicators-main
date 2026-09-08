import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { signal } from '@angular/core';
import PromptManagerComponent from './prompt-manager.component';
import { PromptManagerService } from '@shared/services/prompt-manager.service';
import { PromptItem } from '@shared/interfaces/prompt-manager.interface';

const promptRow: PromptItem = {
  id: 'project-overview',
  name: 'Project Overview',
  description: 'Prompt used to synthesize a project overview.',
  sections: ['system_role', 'context'],
  variables: [],
  default_prompt: {},
  user_prompt: { system_role: 'stored role', context: 'stored context' },
  is_modified: true,
  created_at: '2026-08-20T17:25:48.370307+00:00',
  updated_at: '2026-08-27T20:17:09.994763+00:00',
  updated_by: 'd.zuniga@cgiar.org'
};

describe('PromptManagerComponent', () => {
  let fixture: ComponentFixture<PromptManagerComponent>;
  let component: PromptManagerComponent;
  let serviceMock: {
    loadList: jest.Mock;
    openEdit: jest.Mock;
    items: ReturnType<typeof signal<PromptItem[]>>;
    loading: ReturnType<typeof signal<boolean>>;
    loadError: ReturnType<typeof signal<boolean>>;
  };

  beforeEach(async () => {
    serviceMock = {
      loadList: jest.fn().mockResolvedValue(undefined),
      openEdit: jest.fn(),
      items: signal<PromptItem[]>([promptRow]),
      loading: signal(false),
      loadError: signal(false)
    };

    await TestBed.configureTestingModule({
      imports: [PromptManagerComponent],
      providers: [provideNoopAnimations(), { provide: PromptManagerService, useValue: serviceMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(PromptManagerComponent);
    component = fixture.componentInstance;
  });

  it('should load the prompts on init', () => {
    fixture.detectChanges();

    expect(serviceMock.loadList).toHaveBeenCalled();
  });

  it('should render one row per prompt with name, description, last modified and updated by', () => {
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(1);
    const cells = rows[0].querySelectorAll('td');
    expect(cells).toHaveLength(5);
    expect(cells[0].textContent).toContain('Project Overview');
    expect(cells[1].textContent).toContain(promptRow.description);
    expect(cells[2].textContent).toContain(component.formatUpdatedAt(promptRow.updated_at));
    expect(cells[3].textContent).toContain('d.zuniga@cgiar.org');
    expect(cells[4].querySelector('button')).not.toBeNull();
  });

  it('should fall back to a dash when description or updated_by are missing', () => {
    serviceMock.items.set([{ ...promptRow, description: undefined, updated_by: null }]);
    fixture.detectChanges();

    const cells = fixture.nativeElement.querySelectorAll('tbody tr td');
    expect(cells[1].textContent.trim()).toBe('—');
    expect(cells[3].textContent.trim()).toBe('—');
  });

  it('should open the edit modal through the service when the action is clicked', () => {
    fixture.detectChanges();

    const editButton: HTMLButtonElement = fixture.nativeElement.querySelector('tbody tr button');
    editButton.click();

    expect(serviceMock.openEdit).toHaveBeenCalledWith(promptRow);
  });

  it('should render the load error instead of the table when the request failed', () => {
    serviceMock.loadError.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('p-table')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('We could not load the prompts');
  });

  it('should render the empty state when there are no prompts', () => {
    serviceMock.items.set([]);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No prompts found');
  });

  it('formatUpdatedAt should fall back to a dash for missing or invalid dates', () => {
    expect(component.formatUpdatedAt(null)).toBe('—');
    expect(component.formatUpdatedAt('not-a-date')).toBe('—');
    expect(component.formatUpdatedAt('2026-08-27T20:17:09.994763+00:00')).toContain('08/27/2026');
  });

  it('should expose fixed and fluid column styles', () => {
    const w = component.columnWidths;
    expect(component.fixedColumnStyle(120)).toEqual({ width: '120px', minWidth: '120px', maxWidth: '120px' });
    expect(component.descriptionColumnStyle()).toEqual({
      minWidth: `${w.descriptionMin}px`,
      width: 'auto',
      maxWidth: 'none'
    });
    expect(component.tableStyle()['min-width']).toBe(
      `${w.name + w.descriptionMin + w.lastModified + w.updatedBy + w.actions}px`
    );
  });
});
