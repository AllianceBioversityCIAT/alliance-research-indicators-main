import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-dynamic-input',
  imports: [FloatLabelModule, InputTextModule, ReactiveFormsModule, CommonModule],
  templateUrl: './dynamic-input.component.html'
})
export class DynamicInputComponent {
  @Input() field!: any;
  @Input() formGroup!: FormGroup;
}
