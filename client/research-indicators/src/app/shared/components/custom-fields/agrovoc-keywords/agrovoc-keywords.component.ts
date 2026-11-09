import { afterRenderEffect, Component, computed, ElementRef, inject, input, model, signal, ViewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChipModule } from 'primeng/chip';
import { IconField } from 'primeng/iconfield';
import { SearchIcon } from 'primeng/icons/search';
import { InputIcon } from 'primeng/inputicon';
import { InputText } from 'primeng/inputtext';
import { Select, SelectChangeEvent, SelectModule } from 'primeng/select';
import { debounceTime, distinctUntilChanged, map, Observable, of, startWith, Subject, switchMap, takeUntil } from 'rxjs';
import { AgrovocTerm } from '@shared/interfaces/agrovoc-term.interface';
import { MainResponse } from '@shared/interfaces/responses.interface';
import { ApiService } from '@shared/services/api.service';

const MIN_QUERY_LENGTH = 3;

interface SearchState {
  kind: 'idle' | 'loading' | 'results' | 'empty' | 'error';
  query: string;
  results: AgrovocTerm[];
}

interface AgrovocOption extends AgrovocTerm {
  alreadySelected: boolean;
}

const IDLE_STATE: SearchState = { kind: 'idle', query: '', results: [] };

@Component({
  selector: 'app-agrovoc-keywords',
  standalone: true,
  imports: [SelectModule, ChipModule, IconField, InputIcon, InputText, SearchIcon],
  templateUrl: './agrovoc-keywords.component.html',
  styleUrl: './agrovoc-keywords.component.scss'
})
export class AgrovocKeywordsComponent {
  private readonly api = inject(ApiService);
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly query$ = new Subject<string>();
  private readonly cancelSearch$ = new Subject<void>();
  /**
   * distinctUntilChanged would swallow a retry of the text that just failed.
   * Set on error and consumed by the next comparison (R-AGV-005).
   */
  private retrySameQueryAfterError = false;

  readonly keywords = model<string[]>([]);
  readonly disabled = input(false);

  readonly searchText = signal('');
  readonly state = signal<SearchState>(IDLE_STATE);

  @ViewChild(Select) private picker?: Select;

  readonly terms = computed<AgrovocOption[]>(() =>
    this.state().results.map(term => ({
      ...term,
      alreadySelected: this.isAlreadySelected(term.label)
    }))
  );

  constructor() {
    this.query$
      .pipe(
        map(value => value.trim()),
        debounceTime(500),
        distinctUntilChanged((previous, current) => this.sameSettledText(previous, current)),
        switchMap(query => this.fetchTerms(query)),
        takeUntilDestroyed()
      )
      .subscribe(state => this.state.set(state));

    afterRenderEffect(() => {
      this.keywords();
      this.disabled();
      const chips = this.host.nativeElement.querySelectorAll('p-chip[data-remove-label]');
      chips.forEach((node: Element) => {
        const label = node.getAttribute('data-remove-label');
        const remove = node.querySelector('[data-pc-section="removeicon"]');
        if (remove && label) {
          remove.setAttribute('aria-label', label);
        }
      });
    });

    // PrimeNG 19 positions the overlay only when it opens (`optionsChanged` is
    // never set, so ngAfterViewChecked never re-aligns). This panel opens on the
    // hint row and grows when results arrive, so re-align after each rendered state.
    afterRenderEffect(() => {
      this.state();
      this.realignOpenPanel();
    });
  }

  onSearchInput(value: string): void {
    if (this.disabled()) {
      return;
    }
    this.searchText.set(value);
    this.query$.next(value);
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  onTermPicked(event: SelectChangeEvent): void {
    const value = event.value as AgrovocOption | null;
    if (!value || typeof value !== 'object' || typeof value.label !== 'string') {
      return;
    }
    if (!this.isAlreadySelected(value.label)) {
      this.keywords.update(current => [...current, value.label]);
    }
    // ngModel would keep the picked option as the field value. Write null on the
    // select itself so it stays a picker (and so [disabled] is not cleared by NgModel).
    this.picker?.writeValue(null);
  }

  removeKeyword(keyword: string): void {
    if (this.disabled()) {
      return;
    }
    this.keywords.update(current => current.filter(item => item !== keyword));
  }

  onPanelHide(): void {
    this.searchText.set('');
    this.cancelSearch$.next();
    this.state.set(IDLE_STATE);
    this.query$.next('');
  }

  private fetchTerms(query: string): Observable<SearchState> {
    if (this.disabled() || query.length < MIN_QUERY_LENGTH) {
      return of({ kind: 'idle', query, results: [] });
    }
    return this.api.GET_AgrovocSearch$(query).pipe(
      map(response => this.toState(query, response)),
      startWith<SearchState>({ kind: 'loading', query, results: [] }),
      takeUntil(this.cancelSearch$)
    );
  }

  private toState(query: string, response: MainResponse<AgrovocTerm[]>): SearchState {
    if (!response.successfulRequest) {
      this.retrySameQueryAfterError = true;
      return { kind: 'error', query, results: [] };
    }
    const results = response.data ?? [];
    if (results.length === 0) {
      return { kind: 'empty', query, results: [] };
    }
    return { kind: 'results', query, results };
  }

  private sameSettledText(previous: string, current: string): boolean {
    if (this.retrySameQueryAfterError) {
      this.retrySameQueryAfterError = false;
      if (previous === current) {
        return false;
      }
    }
    return previous === current;
  }

  private isAlreadySelected(label: string): boolean {
    return this.keywords().some(keyword => keyword.toLowerCase() === label.toLowerCase());
  }

  private realignOpenPanel(): void {
    const picker = this.picker;
    if (!picker?.overlayVisible || !picker.overlayViewChild) {
      return;
    }
    try {
      picker.overlayViewChild.alignOverlay();
    } catch (error) {
      // PrimeNG 19.0.6 writes top/left, then throws ReferenceError: `origin` is
      // not defined in DomHandler.absolutePosition. The flip is already applied.
      if (!(error instanceof ReferenceError) || !String((error as ReferenceError).message).includes('origin')) {
        throw error;
      }
    }
  }
}
