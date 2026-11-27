import { Directive, ElementRef, effect, inject, input } from '@angular/core';

// D-STF-44. Depends on PrimeNG 19 rendering an inner <button> inside <p-button>.
// PrimeNG writes aria-label on that inner button and leaves host attributes on
// <p-button>. The pressed state has to sit on the button that takes focus.

@Directive({
  selector: 'p-button[appOdsPressed]',
  standalone: true
})
export class OdsPressedDirective {
  private readonly host = inject(ElementRef<HTMLElement>);
  readonly appOdsPressed = input.required<string>();

  constructor() {
    effect(() => {
      this.host.nativeElement.querySelector('button')?.setAttribute('aria-pressed', this.appOdsPressed());
    });
  }
}
