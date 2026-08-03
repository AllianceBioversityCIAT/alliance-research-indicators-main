import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-dynamic-title',
  imports: [],
  templateUrl: './dynamic-title.component.html'
})
export class DynamicTitleComponent {
  @Input() text!: string;
}
