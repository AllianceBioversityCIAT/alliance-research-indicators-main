import { Component, EventEmitter, Input, OnInit, OnChanges, Output, SimpleChanges, effect, inject, signal, WritableSignal } from '@angular/core';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { TextareaComponent } from '@shared/components/custom-fields/textarea/textarea.component';
import { SubmissionService } from '@shared/services/submission.service';

export interface QuantificationItemData {
  number: number | null;
  unit: string;
  comments: string;
}

@Component({
  selector: 'app-quantification-item',
  standalone: true,
  imports: [InputComponent, TextareaComponent],
  templateUrl: './quantification-item.component.html'
})
export class QuantificationItemComponent implements OnInit, OnChanges {
  @Input() quantification!: QuantificationItemData;
  @Input() index!: number;
  @Input() quantNumber = 1;
  @Input() headerLabel = 'ACTUAL COUNT';
  @Output() update = new EventEmitter<QuantificationItemData>();
  @Output() delete = new EventEmitter<void>();

  submission = inject(SubmissionService);

  body: WritableSignal<QuantificationItemData> = signal({ number: null, unit: '', comments: '' });
  private initialized = false;

  valueEffect = effect(() => {
    if (this.initialized) {
      this.update.emit(this.body());
    }
  });

  ngOnInit(): void {
    this.body.set(this.quantification || { number: null, unit: '', comments: '' });
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['quantification'] && this.initialized) {
      const next = this.quantification || { number: null, unit: '', comments: '' };
      if (JSON.stringify(this.body()) !== JSON.stringify(next)) {
        this.body.set(next);
      }
    }
  }

  onValueChange() {
    this.update.emit(this.body());
  }

  onDelete() {
    if (!this.submission.isEditableStatus()) return;
    this.delete.emit();
  }
}


