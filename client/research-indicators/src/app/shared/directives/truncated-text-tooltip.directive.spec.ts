import { Component, DebugElement } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Tooltip } from 'primeng/tooltip';
import { TruncatedTextTooltipDirective } from './truncated-text-tooltip.directive';

@Component({
  standalone: true,
  imports: [TruncatedTextTooltipDirective],
  template: `
    <div
      id="target"
      [appTruncatedTooltip]="label"
      tooltipPosition="top"
      style="display:block;overflow:hidden;white-space:nowrap;width:10px">
      {{ label }}
    </div>
  `
})
class TestHostComponent {
  label: string | null | undefined = 'Sample label';
}

describe('TruncatedTextTooltipDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let element: HTMLElement;
  let directive: TruncatedTextTooltipDirective;
  let tooltip: Tooltip;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    const debugEl: DebugElement = fixture.debugElement.query(By.css('#target'));
    element = debugEl.nativeElement as HTMLElement;
    directive = debugEl.injector.get(TruncatedTextTooltipDirective);
    tooltip = debugEl.injector.get(Tooltip);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(directive).toBeTruthy();
  });

  it('should disable tooltip for em dash labels on hover', () => {
    fixture.componentInstance.label = '—';
    fixture.detectChanges();
    jest.spyOn(tooltip, 'setOption');

    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(tooltip.setOption).toHaveBeenCalledWith({ disabled: true });
  });

  it('should disable tooltip for empty labels on hover', () => {
    fixture.componentInstance.label = '   ';
    fixture.detectChanges();

    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(tooltip.disabled).toBe(true);
  });

  it('should enable tooltip when text is truncated horizontally', () => {
    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 200 });
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 10 });
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 20 });
    Object.defineProperty(element, 'clientHeight', { configurable: true, value: 20 });

    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(tooltip.content).toBe('Sample label');
    expect(tooltip.disabled).toBe(false);
  });

  it('should enable tooltip when text is truncated vertically', () => {
    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 10 });
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 10 });
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 80 });
    Object.defineProperty(element, 'clientHeight', { configurable: true, value: 20 });

    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(tooltip.disabled).toBe(false);
  });

  it('should keep tooltip disabled when content fits', () => {
    Object.defineProperty(element, 'scrollWidth', { configurable: true, value: 10 });
    Object.defineProperty(element, 'clientWidth', { configurable: true, value: 10 });
    Object.defineProperty(element, 'scrollHeight', { configurable: true, value: 20 });
    Object.defineProperty(element, 'clientHeight', { configurable: true, value: 20 });

    element.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));

    expect(tooltip.disabled).toBe(true);
  });

  it('should remove mouseenter listener on destroy', () => {
    const removeSpy = jest.spyOn(element, 'removeEventListener');
    directive.ngOnDestroy();
    expect(removeSpy).toHaveBeenCalledWith('mouseenter', expect.any(Function), true);
  });

  it('should update tooltip content when input changes', () => {
    fixture.componentInstance.label = '  Updated  ';
    fixture.detectChanges();
    expect(tooltip.content).toBe('Updated');
  });

  it('should coerce undefined tooltip input to empty string', () => {
    fixture.componentInstance.label = undefined;
    fixture.detectChanges();
    expect(tooltip.content).toBe('');
  });

  it('should coerce null tooltip input to empty string', () => {
    fixture.componentInstance.label = null;
    fixture.detectChanges();
    expect(tooltip.content).toBe('');
  });

  it('should handle undefined tooltip content when syncing', () => {
    (directive as unknown as { setTooltipContent: (text: string) => void }).setTooltipContent(
      undefined as unknown as string
    );
    expect(tooltip.content).toBe('');
  });
});
