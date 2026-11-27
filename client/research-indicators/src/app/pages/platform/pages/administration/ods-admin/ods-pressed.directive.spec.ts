import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ButtonModule } from 'primeng/button';
import { OdsPressedDirective } from './ods-pressed.directive';

// @akili-spec institutional-performance/strategy-framework D-STF-44.
// The pressed state is copied onto PrimeNG's inner button, the one that takes focus.

@Component({
  standalone: true,
  imports: [ButtonModule, OdsPressedDirective],
  template: `<p-button icon="pi pi-bars" [appOdsPressed]="pressed()" data-testid="pressed-host" />`
})
class PressedHost {
  readonly pressed = signal('false');
}

describe('OdsPressedDirective', () => {
  let fixture: ComponentFixture<PressedHost>;

  const inner = () => fixture.nativeElement.querySelector('button') as HTMLButtonElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PressedHost],
      providers: [provideNoopAnimations()]
    }).compileComponents();
    fixture = TestBed.createComponent(PressedHost);
    fixture.detectChanges();
  });

  it('copies the pressed state onto the inner button and follows later changes', () => {
    expect(inner().getAttribute('aria-pressed')).toBe('false');
    expect(fixture.nativeElement.querySelector('[data-testid="pressed-host"]').getAttribute('aria-pressed')).toBeNull();

    fixture.componentInstance.pressed.set('true');
    fixture.detectChanges();

    expect(inner().getAttribute('aria-pressed')).toBe('true');
  });
});
