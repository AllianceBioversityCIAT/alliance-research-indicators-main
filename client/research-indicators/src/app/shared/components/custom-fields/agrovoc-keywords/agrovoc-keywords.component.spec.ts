import { ComponentFixture, fakeAsync, flush, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Select } from 'primeng/select';
import { Subject } from 'rxjs';
import { AgrovocTerm } from '@shared/interfaces/agrovoc-term.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ApiService } from '@shared/services/api.service';
import { AgrovocKeywordsComponent } from './agrovoc-keywords.component';

describe('AgrovocKeywordsComponent', () => {
  let fixture: ComponentFixture<AgrovocKeywordsComponent>;
  let component: AgrovocKeywordsComponent;
  let search: jest.Mock;
  let subjects: Subject<MainResponse<AgrovocTerm[]>>[];
  let queries: string[];

  function envelope(data: AgrovocTerm[], successfulRequest: boolean): MainResponse<AgrovocTerm[]> {
    return {
      data,
      status: successfulRequest ? 200 : 502,
      description: successfulRequest ? 'ok' : 'error',
      timestamp: '2026-10-19T00:00:00.000Z',
      path: '/api/tools/agrovoc/search',
      successfulRequest,
      errorDetail: { errors: '', detail: '', description: '' }
    };
  }

  function term(label: string, matched_label?: string): AgrovocTerm {
    return { uri: `urn:${label}`, label, ...(matched_label ? { matched_label } : {}) };
  }

  function installSearch(): void {
    subjects = [];
    queries = [];
    search.mockImplementation((query: string) => {
      queries.push(query);
      const subject = new Subject<MainResponse<AgrovocTerm[]>>();
      subjects.push(subject);
      return subject;
    });
  }

  function setup(options?: { keywords?: string[]; disabled?: boolean }): void {
    installSearch();
    fixture = TestBed.createComponent(AgrovocKeywordsComponent);
    component = fixture.componentInstance;
    if (options?.keywords) {
      fixture.componentRef.setInput('keywords', options.keywords);
    }
    if (options?.disabled) {
      fixture.componentRef.setInput('disabled', true);
    }
    fixture.detectChanges();
  }

  function selectInstance(): Select {
    const found = fixture.debugElement.query(By.directive(Select));
    expect(found).not.toBeNull();
    return found.componentInstance as Select;
  }

  function openPanel(): void {
    selectInstance().show();
    fixture.detectChanges();
    flush();
  }

  function searchInput(): HTMLInputElement {
    const input = document.body.querySelector<HTMLInputElement>('input[aria-label="Search AGROVOC keywords"]');
    expect(input).not.toBeNull();
    return input as HTMLInputElement;
  }

  function setQuery(value: string): void {
    const input = searchInput();
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function typeChars(text: string, gapMs: number): void {
    let value = '';
    for (const char of text) {
      value += char;
      setQuery(value);
      if (gapMs > 0) {
        tick(gapMs);
      }
    }
  }

  function stateText(): string {
    return document.body.querySelector('[data-testid="agrovoc-state"]')?.textContent ?? '';
  }

  function optionLabels(): string[] {
    return Array.from(document.body.querySelectorAll('.agrovoc-keywords__label')).map(el => el.textContent?.trim() ?? '');
  }

  function optionByLabel(label: string): HTMLElement {
    const found = Array.from(document.body.querySelectorAll('.p-select-option')).find(
      el => el.querySelector('.agrovoc-keywords__label')?.textContent?.trim() === label
    );
    expect(found).toBeTruthy();
    return found as HTMLElement;
  }

  beforeAll(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn()
      }))
    });
  });

  beforeEach(async () => {
    search = jest.fn();
    await TestBed.configureTestingModule({
      imports: [AgrovocKeywordsComponent],
      providers: [{ provide: ApiService, useValue: { GET_AgrovocSearch$: search } }]
    }).compileComponents();
  });

  afterEach(() => {
    fixture?.destroy();
    document.body.querySelectorAll('.p-select-overlay, .p-overlay, .agrovoc-keywords-panel').forEach(el => el.remove());
  });

  it('case 1 — b, e, a, n 100ms apart settle into one search for bean', fakeAsync(() => {
    setup();
    openPanel();

    typeChars('bean', 100);
    tick(500);
    fixture.detectChanges();

    expect(queries).toEqual(['bean']);
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith('bean');
  }));

  it('case 2 — a stale bean response is unsubscribed and never rendered', fakeAsync(() => {
    setup();
    openPanel();

    setQuery('bean');
    tick(500);
    fixture.detectChanges();

    expect(queries).toEqual(['bean']);
    expect(subjects[0].observed).toBe(true);

    setQuery('beans');
    tick(500);
    fixture.detectChanges();

    expect(queries).toEqual(['bean', 'beans']);
    const beanStillObserved = subjects[0].observed;

    subjects[0].next(envelope([term('URANIUM_STALE')], true));
    fixture.detectChanges();

    expect(optionLabels()).not.toContain('URANIUM_STALE');
    expect(beanStillObserved).toBe(false);
    expect(stateText()).toContain('Searching AGROVOC');

    subjects[1].next(envelope([term('beans')], true));
    fixture.detectChanges();

    expect(optionLabels()).toEqual(['beans']);
    expect(optionLabels()).not.toContain('URANIUM_STALE');
  }));

  it('case 3 — fewer than 3 characters sends no request and shows the hint', fakeAsync(() => {
    setup();
    openPanel();

    setQuery('be');
    tick(500);
    fixture.detectChanges();

    expect(queries).toEqual([]);
    expect(stateText()).toContain('Type at least 3 characters');

    setQuery('bean');
    tick(500);
    fixture.detectChanges();
    expect(subjects[0].observed).toBe(true);

    setQuery('be');
    tick(500);
    fixture.detectChanges();

    expect(queries).toEqual(['bean']);
    expect(subjects[0].observed).toBe(false);
    expect(stateText()).toContain('Type at least 3 characters');

    subjects[0].next(envelope([term('URANIUM_STALE')], true));
    fixture.detectChanges();
    expect(optionLabels()).not.toContain('URANIUM_STALE');
  }));

  it('case 4 — the same settled text searches once, and again after an error', fakeAsync(() => {
    setup();
    openPanel();

    setQuery('bean');
    tick(500);
    fixture.detectChanges();
    expect(queries).toEqual(['bean']);

    setQuery('bean');
    tick(500);
    fixture.detectChanges();
    expect(queries).toEqual(['bean']);

    subjects[0].next(envelope([], false));
    fixture.detectChanges();

    setQuery('bean');
    tick(500);
    fixture.detectChanges();
    expect(queries).toEqual(['bean', 'bean']);
  }));

  it('case 5 — picking beans stores the label and resets the select', fakeAsync(() => {
    setup();
    openPanel();

    setQuery('beans');
    tick(500);
    fixture.detectChanges();
    subjects[0].next(envelope([term('beans')], true));
    fixture.detectChanges();

    optionByLabel('beans').click();
    fixture.detectChanges();
    tick(500);

    expect(component.keywords()).toEqual(['beans']);
    expect(selectInstance().value).toBeNull();
  }));

  it('case 6 — Beans already selected disables beans and does not add a second chip', fakeAsync(() => {
    setup({ keywords: ['Beans'] });
    openPanel();

    setQuery('beans');
    tick(500);
    fixture.detectChanges();
    subjects[0].next(envelope([term('beans')], true));
    fixture.detectChanges();

    const option = optionByLabel('beans');
    const disabled = option.classList.contains('p-disabled');
    option.click();
    fixture.detectChanges();
    tick(500);

    expect({ disabled, keywords: component.keywords(), chips: fixture.nativeElement.querySelectorAll('p-chip').length }).toEqual({
      disabled: true,
      keywords: ['Beans'],
      chips: 1
    });
  }));

  it('case 7 — Enter in the search box with no results leaves keywords unchanged', fakeAsync(() => {
    setup();
    openPanel();

    setQuery('my custom word');
    tick(500);
    fixture.detectChanges();
    subjects[0].next(envelope([], true));
    fixture.detectChanges();

    expect(stateText()).toContain('No AGROVOC terms match');
    searchInput().dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    fixture.detectChanges();

    expect(component.keywords()).toEqual([]);
    expect(fixture.nativeElement.querySelectorAll('p-chip').length).toBe(0);
  }));

  it('case 8 — legacy keywords render as chips and one can be removed', fakeAsync(() => {
    setup({ keywords: ['In-Person', 'Capacity Sharing'] });

    const chips = () => Array.from(fixture.nativeElement.querySelectorAll('.p-chip-label')).map(el => (el as HTMLElement).textContent?.trim());
    expect(chips()).toEqual(['In-Person', 'Capacity Sharing']);

    const remove = fixture.nativeElement.querySelector('.p-chip-remove-icon') as HTMLElement;
    expect(remove).not.toBeNull();
    remove.click();
    fixture.detectChanges();

    expect(component.keywords()).toEqual(['Capacity Sharing']);
    expect(chips()).toEqual(['Capacity Sharing']);
  }));

  it('removing an older keyword keeps the newer chips visible', fakeAsync(() => {
    // p-chip hides itself on remove; a chip instance reused for the next keyword
    // would carry that display:none and hide a keyword that is still selected.
    setup({ keywords: ['In-Person', 'asd', 'fgh'] });

    const remove = fixture.nativeElement.querySelector('.p-chip-remove-icon') as HTMLElement;
    remove.click();
    fixture.detectChanges();

    const visibleChips = Array.from(fixture.nativeElement.querySelectorAll('p-chip') as NodeListOf<HTMLElement>)
      .filter(chip => chip.style.display !== 'none')
      .map(chip => chip.querySelector('.p-chip-label')?.textContent?.trim());
    expect(component.keywords()).toEqual(['asd', 'fgh']);
    expect(visibleChips).toEqual(['asd', 'fgh']);
  }));

  it('case 9 — a disabled field cannot search or remove chips', fakeAsync(() => {
    setup({ keywords: ['In-Person', 'Capacity Sharing'], disabled: true });

    const selectHost = fixture.nativeElement.querySelector('p-select') as HTMLElement;
    expect(selectHost.classList.contains('p-disabled')).toBe(true);
    expect(fixture.nativeElement.querySelectorAll('.p-chip-remove-icon').length).toBe(0);
    expect(fixture.nativeElement.textContent).toContain('In-Person');
    expect(fixture.nativeElement.textContent).toContain('Capacity Sharing');

    openPanel();
    setQuery('bean');
    tick(500);
    fixture.detectChanges();

    expect(queries).toEqual([]);
    expect(search).not.toHaveBeenCalled();
  }));

  it('the opened panel header uses the built-in filter order: input then icon, inside p-iconfield', fakeAsync(() => {
    setup();
    openPanel();

    const header = document.body.querySelector('.agrovoc-keywords-panel .p-select-header');
    expect(header).not.toBeNull();
    const iconField = header!.querySelector('p-iconfield');
    expect(iconField).not.toBeNull();

    const filter = iconField!.querySelector('input.p-select-filter');
    const icon = iconField!.querySelector('p-inputicon');
    expect(filter).not.toBeNull();
    expect(icon).not.toBeNull();

    const children = Array.from(iconField!.children);
    expect(children.indexOf(filter as Element)).toBeLessThan(children.indexOf(icon as Element));
    expect(document.body.querySelector('.p-input-icon-left')).toBeNull();
  }));

  it('case 10 — loading hides the empty text, then empty, error, and matched_label', fakeAsync(() => {
    setup({ keywords: ['kept-chip'] });
    openPanel();

    setQuery('bean');
    tick(500);
    fixture.detectChanges();

    expect(stateText()).toContain('Searching AGROVOC');
    expect(stateText()).not.toContain('No AGROVOC terms match');
    expect(document.body.textContent).not.toContain('No AGROVOC terms match');
    expect(fixture.nativeElement.textContent).toContain('kept-chip');

    subjects[0].next(envelope([], true));
    fixture.detectChanges();

    expect(stateText()).toContain('No AGROVOC terms match');
    expect(stateText()).toContain('bean');
    expect(stateText()).not.toContain('Searching AGROVOC');
    expect(component.keywords()).toEqual(['kept-chip']);

    setQuery('corn');
    tick(500);
    fixture.detectChanges();

    expect(stateText()).toContain('Searching AGROVOC');
    expect(stateText()).not.toContain('No AGROVOC terms match');

    subjects[1].next(envelope([], false));
    fixture.detectChanges();

    expect(stateText()).toContain('AGROVOC search is unavailable, try again');
    expect(component.keywords()).toEqual(['kept-chip']);
    expect(fixture.nativeElement.querySelectorAll('p-chip').length).toBe(1);

    setQuery('soy');
    tick(500);
    fixture.detectChanges();
    subjects[2].next(envelope([term('soybean', 'Glycine max')], true));
    fixture.detectChanges();

    const matched = document.body.querySelector('.agrovoc-keywords__matched');
    expect(matched?.textContent?.trim()).toBe('matched: Glycine max');
    expect(optionLabels()).toEqual(['soybean']);
    expect(stateText()).not.toContain('AGROVOC search is unavailable');
    expect(component.keywords()).toEqual(['kept-chip']);
  }));

  it('realigns the open panel after results render, and not while the panel is closed', fakeAsync(() => {
    setup();
    const overlay = selectInstance().overlayViewChild;
    expect(overlay).toBeTruthy();
    const align = jest.spyOn(overlay!, 'alignOverlay');

    flush();
    fixture.detectChanges();
    expect(align).not.toHaveBeenCalled();

    openPanel();
    align.mockClear();

    setQuery('bean');
    tick(500);
    fixture.detectChanges();
    flush();

    const callsBeforeResults = align.mock.calls.length;
    let alignedAfterResultsRendered = false;
    align.mockImplementation(() => {
      alignedAfterResultsRendered = optionLabels().includes('beans');
    });

    subjects[0].next(envelope([term('beans')], true));
    fixture.detectChanges();
    flush();

    expect(optionLabels()).toEqual(['beans']);
    expect(align).toHaveBeenCalledTimes(callsBeforeResults + 1);
    expect(alignedAfterResultsRendered).toBe(true);
  }));
});
