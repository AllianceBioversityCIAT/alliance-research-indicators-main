import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-dropdown',
    imports: [],
    templateUrl: './dropdown.component.html',
    styleUrl: './dropdown.component.scss'
})
export class DropdownComponent {
  @Input() position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right';
  @Input() positionX: 'left' | 'right' | '' = '';
  @Input() positionY: 'top' | 'bottom' | '' = '';
}
