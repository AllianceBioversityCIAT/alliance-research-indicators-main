import { ChangeDetectionStrategy, Component, computed, effect, ElementRef, inject, input, output, signal, untracked, viewChild } from '@angular/core';
import { AutoComplete, AutoCompleteModule } from 'primeng/autocomplete';
import { FrameworkStaffOption } from '@shared/interfaces/strategy-framework.interface';
import { ApiService } from '@shared/services/api.service';

/** A responsible chip. Search hits are active; an existing row may be inactive (R-STF-004 AC.2). */
export interface StaffPickerPerson extends FrameworkStaffOption {
  isActiveStaff?: boolean;
}

const MIN_QUERY = 2;
const MAX_HITS = 20;

// @akili-spec institutional-performance/strategy-framework T-15 — design §6.5, R-STF-004, NFR-STF-004.
// p-autoComplete multiple (parity org-unit-form delegates): the combobox searches, the list below holds the chips.
// PrimeNG 19 leaves modelValue null for an initial array, so selectedItem never paints those chips.
// A typed string is never a chip: only a carnet from the last A4 response can be added.
// Reorder is up/down buttons (no drag). jsdom cannot prove the focus ring or contrast (KZ-017).
@Component({
  selector: 'app-staff-picker',
  standalone: true,
  imports: [AutoCompleteModule],
  templateUrl: './staff-picker.component.html',
  styleUrl: './staff-picker.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StaffPickerComponent {
  private readonly api = inject(ApiService);
  private readonly host = inject(ElementRef<HTMLElement>);

  readonly people = input<StaffPickerPerson[]>([]);
  readonly peopleChange = output<StaffPickerPerson[]>();

  /** Null until the user edits. Until then the chips are the input, on the first render. */
  private readonly edited = signal<StaffPickerPerson[] | null>(null);
  readonly suggestions = signal<StaffPickerPerson[]>([]);
  readonly shown = computed(() => this.edited() ?? this.people());
  private readonly box = viewChild(AutoComplete);

  private searchToken = 0;
  /** Carnets the last A4 response offered. A chip cannot be invented outside this set. */
  private offered = new Set<string>();

  constructor() {
    effect(() => {
      const incoming = this.people();
      untracked(() => {
        const edited = this.edited();
        if (edited !== null && !samePeople(incoming, edited)) this.edited.set(null);
      });
    });
    effect(() => {
      this.shown();
      const input = this.host.nativeElement.querySelector('#staffPickerInput');
      input?.setAttribute('aria-describedby', 'staffPickerHint');
    });
  }

  private current(): StaffPickerPerson[] {
    return this.shown();
  }

  search(query: string): void {
    const token = ++this.searchToken;
    const text = query.trim();
    if (text.length < MIN_QUERY) {
      this.suggestions.set([]);
      this.offered = new Set();
      return;
    }
    const request = this.api.GET_StrategyFrameworkStaff(text);
    // .then, not await: a resolved Jest promise's continuation is not a fakeAsync microtask,
    // so the suggestions would land after the assertion (observed). A real Promise still updates the list.
    void request.then(
      response => {
        if (token !== this.searchToken) return;
        const rows = response?.successfulRequest ? (response.data ?? []) : [];
        const taken = new Set(this.current().map(person => person.carnet));
        const available = rows
          .filter(row => !isInactive(row) && !taken.has(row.carnet))
          .slice(0, MAX_HITS)
          .map(row => ({ ...row, isActiveStaff: true }));
        this.offered = new Set(available.map(person => person.carnet));
        this.suggestions.set(available);
      },
      () => {
        if (token !== this.searchToken) return;
        this.offered = new Set();
        this.suggestions.set([]);
      }
    );
  }

  /**
   * A suggestion click, or Enter on the typed text.
   * Strings and carnets the server did not offer are dropped.
   */
  pick(value: unknown): void {
    const person = this.accept(value);
    const list = this.current();
    if (person && !list.some(existing => existing.carnet === person.carnet)) this.commit([...list, person]);
    // Multiple mode stores the pick (or the typed string) on the autocomplete. The chips live in our list.
    this.box()?.writeValue([]);
  }

  /** Enter on text that is not a server hit must not become a chip. */
  onSearchKey(event: Event): void {
    if (!(event instanceof KeyboardEvent) || event.key !== 'Enter') return;
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const text = input.value.trim();
    input.value = '';
    if (text.length < MIN_QUERY) return;
    const match = this.suggestions().find(person => person.name.toLowerCase() === text.toLowerCase() || (person.email ?? '').toLowerCase() === text.toLowerCase());
    this.pick(match ?? text);
  }

  move(person: StaffPickerPerson, direction: -1 | 1, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    const list = [...this.current()];
    const index = list.findIndex(item => item.carnet === person.carnet);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= list.length) return;
    const [item] = list.splice(index, 1);
    list.splice(target, 0, item);
    this.commit(list);
  }

  remove(person: StaffPickerPerson, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    this.commit(this.current().filter(item => item.carnet !== person.carnet));
  }

  chipTitle(person: StaffPickerPerson): string {
    return person.email ? `${person.name} ${person.email}` : person.name;
  }

  isFirst(person: StaffPickerPerson): boolean {
    return this.current()[0]?.carnet === person.carnet;
  }

  isLast(person: StaffPickerPerson): boolean {
    const list = this.current();
    return list[list.length - 1]?.carnet === person.carnet;
  }

  private accept(item: unknown): StaffPickerPerson | null {
    if (!item || typeof item !== 'object') return null;
    const person = item as StaffPickerPerson;
    if (typeof person.carnet !== 'string' || person.carnet.trim() === '') return null;
    const already = this.current().some(existing => existing.carnet === person.carnet);
    if (!already && !this.offered.has(person.carnet)) return null;
    return { ...person, isActiveStaff: person.isActiveStaff !== false };
  }

  private commit(next: StaffPickerPerson[]): void {
    if (samePeople(next, this.current())) return;
    this.edited.set(next);
    this.peopleChange.emit(next.map(person => ({ ...person })));
  }
}

function isInactive(row: FrameworkStaffOption): boolean {
  return 'isActiveStaff' in row && (row as StaffPickerPerson).isActiveStaff === false;
}

function samePeople(next: readonly StaffPickerPerson[], current: readonly StaffPickerPerson[]): boolean {
  if (next.length !== current.length) return false;
  return next.every((person, index) => person.carnet === current[index]?.carnet && person.isActiveStaff === current[index]?.isActiveStaff);
}
