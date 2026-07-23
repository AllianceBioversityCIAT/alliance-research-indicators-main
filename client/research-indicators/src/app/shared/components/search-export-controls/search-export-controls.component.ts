import { Component, EventEmitter, Input, Output, OnInit, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-search-export-controls',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule],
  templateUrl: './search-export-controls.component.html'
})
export class SearchExportControlsComponent implements OnInit, OnDestroy {
  @Input() applyLabel = 'Apply Filters';
  @Input() badge?: string | number;
  @Input() showOverlayDot = false;
  @Input() showClear = true;
  @Input() searchValue = '';
  @Input() searchPlaceholder = 'Find a result by code, title or creator';

  @Output() apply = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();
  @Output() searchChange = new EventEmitter<string>();

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

  ngOnInit() {
    this.searchSubject
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(value => {
        this.searchChange.emit(value);
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onInputChange(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value.trim();
    this.searchSubject.next(value);
  }

  onEnter(event: Event) {
    const value = (event.target as HTMLInputElement).value.trim();
    this.searchChange.emit(value);
  }
}
