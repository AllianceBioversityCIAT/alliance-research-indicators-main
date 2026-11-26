import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, effect, inject, signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RadioButtonModule } from 'primeng/radiobutton';
import { SelectModule } from 'primeng/select';
import { SubmissionService } from '@shared/services/submission.service';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { ResultOicrAnnex } from '@shared/interfaces/patch-result-evidences.interface';

export type OicrAnnexItemData = ResultOicrAnnex;

export interface OicrAnnexKind {
  id: number;
  label: string;
  field1: { label: string; placeholder: string };
  field2: { label: string; placeholder: string; key: 'photo_credits' | 'file_type' | 'partner_consent'; options?: string[] };
  field3Label: string;
}

/** Fixed annex types (server `OicrAnnexTypeEnum`): labels, placeholders and field kinds follow the 2026 Evidence mockup. */
export const OICR_ANNEX_KINDS: OicrAnnexKind[] = [
  {
    id: 1,
    label: 'Photos',
    field1: { label: 'Description', placeholder: 'Describe the item here' },
    field2: { label: 'Photo credits', placeholder: 'Enter the individual(s) to be credited', key: 'photo_credits' },
    field3Label: 'Links to the photo'
  },
  {
    id: 2,
    label: 'Maps, figures, tables, and graphs',
    field1: { label: 'Description', placeholder: 'Describe the item here' },
    field2: { label: 'Type of file', placeholder: 'Choose an item', key: 'file_type', options: ['Map', 'Figure', 'Table', 'Graph'] },
    field3Label: 'Link to the file'
  },
  {
    id: 3,
    label: "Partners' logos",
    field1: { label: 'Partners', placeholder: "Enter the Partner's name" },
    field2: { label: "Partner's consent secured?", placeholder: 'Choose an item', key: 'partner_consent', options: ['Yes', 'No', 'Not applicable'] },
    field3Label: 'Links to logo and consent'
  }
];

@Component({
  selector: 'app-oicr-annex-item',
  imports: [FormsModule, RadioButtonModule, SelectModule, InputComponent],
  templateUrl: './oicr-annex-item.component.html'
})
export class OicrAnnexItemComponent implements OnInit, OnChanges {
  @Input() item!: OicrAnnexItemData;
  @Input() itemNumber = 1;
  @Output() update = new EventEmitter<OicrAnnexItemData>();
  @Output() delete = new EventEmitter<void>();

  submission = inject(SubmissionService);
  kinds = OICR_ANNEX_KINDS;

  body: WritableSignal<OicrAnnexItemData> = signal(new ResultOicrAnnex());
  private initialized = false;

  valueEffect = effect(() => {
    const value = this.body();
    if (this.initialized) {
      this.update.emit(value);
    }
  });

  ngOnInit(): void {
    this.body.set(this.item || new ResultOicrAnnex());
    this.initialized = true;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['item'] && this.initialized) {
      const next = this.item || new ResultOicrAnnex();
      if (JSON.stringify(this.body()) !== JSON.stringify(next)) {
        this.body.set(next);
      }
    }
  }

  get kind(): OicrAnnexKind | undefined {
    return this.kinds.find(k => k.id === this.body().annex_type_id);
  }

  /** Changing the type clears the second field (and the other types' leftovers). */
  onTypeChange(typeId: number): void {
    this.body.update(current => ({ ...current, annex_type_id: typeId, photo_credits: null, file_type: null, partner_consent: null }));
  }

  onSelectChange(value: string | null): void {
    const key = this.kind?.field2.key;
    if (!key) return;
    this.body.update(current => ({ ...current, [key]: value }));
  }

  get selectValue(): string | null {
    const key = this.kind?.field2.key;
    return key ? (this.body()[key] ?? null) : null;
  }

  onDelete(): void {
    if (!this.submission.isEditableStatus()) return;
    this.delete.emit();
  }
}
