import { Component, Input } from '@angular/core';
import { DynamicInputComponent } from '../dynamic-input/dynamic-input.component';
import { DynamicTitleComponent } from '../dynamic-title/dynamic-title.component';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dynamic-component-selector',
  imports: [DynamicInputComponent, DynamicTitleComponent, ReactiveFormsModule, CommonModule],
  templateUrl: './dynamic-component-selector.component.html',
  styleUrl: './dynamic-component-selector.component.scss'
})
export class DynamicComponentSelectorComponent {
  @Input() field!: any;
  @Input() formGroup!: FormGroup;

  getNestedFormGroup(field: any): FormGroup {
    if (field.attribute && this.formGroup.get(field.attribute) instanceof FormGroup) {
      return this.formGroup.get(field.attribute) as FormGroup;
    }
    return this.formGroup;
  }
}
