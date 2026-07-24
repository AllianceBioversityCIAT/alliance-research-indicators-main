import { Component, Input, WritableSignal } from '@angular/core';

@Component({
  selector: 'app-alert-tag',
  standalone: true,
  imports: [],
  templateUrl: './alert-tag.component.html',
  styleUrl: './alert-tag.component.scss'
})
export class AlertTagComponent {
  @Input() alertMessages!: WritableSignal<string[]>;
}
