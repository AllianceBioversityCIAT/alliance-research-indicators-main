import { Directive, ElementRef, HostListener, inject, Input } from '@angular/core';
import { ActionsService } from '../services/actions.service';

@Directive({
  selector: '[appSaveOnWriting]',
  standalone: true
})
export class SaveOnWritingDirective {
  actions = inject(ActionsService);
  private timeout: ReturnType<typeof setTimeout> = setTimeout(() => null, 0);
  @Input() delay = 2000;

  constructor(private readonly el: ElementRef) {}

  @HostListener('input') onInputChange() {
    clearTimeout(this.timeout);

    this.timeout = setTimeout(() => {
      this.autosave();
    }, this.delay);
  }

  private autosave() {
    // Perform autosave logic here using this.el.nativeElement.value if needed
  }
}
