import { DatePipe } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GetContracts } from '@shared/interfaces/get-contracts.interface';
import { SelectModule } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-shared-result-form',
  imports: [SelectModule, TooltipModule, FormsModule, DatePipe],
  templateUrl: './shared-result-form.component.html',
  styleUrls: ['./shared-result-form.component.scss']
})
export class SharedResultFormComponent implements AfterViewInit, OnChanges {
  @Input() contracts: GetContracts[] = [];
  @Input() contractId: string | null = null;
  @Input() title = 'Reporting Project';
  @Input() maxLength = 117;
  @Input() showWarning = false;
  @Input() getContractStatusClasses: (status: string) => string = () => '';
  @Input() helperText = 'Enter the eligible project under which you are submitting the result. Only Alliance non-pool-funded projects are allowed.';
  @Input() helperText2 = '';
  @Output() validityChanged = new EventEmitter<boolean>();
  @Output() contractIdChange = new EventEmitter<string>();

  @ViewChild('containerRef') containerRef!: ElementRef;
  containerWidth = 0;

  constructor(private readonly cdr: ChangeDetectorRef) {}

  ngAfterViewInit() {
    const observer = new ResizeObserver(entries => {
      for (const entry of entries) {
        this.containerWidth = entry.contentRect.width;
        this.cdr.detectChanges();
      }
    });

    observer.observe(this.containerRef.nativeElement);

    // Force select overlay width when it opens
    this.forceSelectOverlayWidth();
  }

  private forceSelectOverlayWidth() {
    // Observe DOM changes to detect when this form's select opens.
    // Scoped by panelStyleClass — must not touch other app selects (e.g. ToC alignment).
    const observer = new MutationObserver(() => {
      const selectOverlay = document.querySelector(
        '.p-select-overlay.shared-result-form-select-panel'
      ) as HTMLElement;
      if (selectOverlay) {
        // Force overlay width
        selectOverlay.style.width = '100%';
        selectOverlay.style.minWidth = '0';
        selectOverlay.style.maxWidth = '100vw';
        selectOverlay.style.boxSizing = 'border-box';

        // Force list width
        const selectList = selectOverlay.querySelector('.p-select-list') as HTMLElement;
        if (selectList) {
          selectList.style.width = '100%';
          selectList.style.minWidth = '0';
          selectList.style.maxWidth = '100%';
          selectList.style.boxSizing = 'border-box';
        }

        // Force options width
        const selectOptions = selectOverlay.querySelectorAll('.p-select-option');
        selectOptions.forEach(option => {
          (option as HTMLElement).style.maxWidth = '100%';
          (option as HTMLElement).style.minWidth = '0';
          (option as HTMLElement).style.overflow = 'hidden';
          (option as HTMLElement).style.textOverflow = 'ellipsis';
          (option as HTMLElement).style.whiteSpace = 'nowrap';
          (option as HTMLElement).style.boxSizing = 'border-box';
        });

        // Force option labels width
        const optionLabels = selectOverlay.querySelectorAll('.p-select-option-label');
        optionLabels.forEach(label => {
          (label as HTMLElement).style.maxWidth = '100%';
          (label as HTMLElement).style.minWidth = '0';
          (label as HTMLElement).style.overflow = 'hidden';
          (label as HTMLElement).style.textOverflow = 'ellipsis';
          (label as HTMLElement).style.whiteSpace = 'nowrap';
          (label as HTMLElement).style.boxSizing = 'border-box';
        });
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  ngOnChanges() {
    this.validityChanged.emit(!this.isInvalid);
  }

  get isInvalid(): boolean {
    return !this.contractId;
  }

  onContractChange(value: string) {
    this.contractId = value;
    this.contractIdChange.emit(value);
    this.validityChanged.emit(!this.isInvalid);
  }

  getShortDescription(description: string): string {
    const dropdown = document.querySelector('.p-dropdown-panel') as HTMLElement;
    let max = 40;
    if (dropdown) {
      const width = dropdown.offsetWidth;
      if (width > 600) max = 100;
      else if (width > 400) max = 60;
    }
    return description.length > max ? description.slice(0, max) + '...' : description;
  }
}
