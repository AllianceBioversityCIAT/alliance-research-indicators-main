import { AfterViewInit, Directive, ElementRef, OnDestroy, effect, inject, input } from '@angular/core';
import { Tooltip } from 'primeng/tooltip';

@Directive({
  selector: '[appTruncatedTooltip]',
  standalone: true,
  hostDirectives: [
    {
      directive: Tooltip,
      inputs: ['tooltipPosition']
    }
  ]
})
export class TruncatedTextTooltipDirective implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef<HTMLElement>);
  private readonly tooltip = inject(Tooltip);

  readonly appTruncatedTooltip = input('', {
    transform: (value: string | null | undefined): string => value ?? ''
  });

  private readonly onMouseEnterCapture = (): void => {
    this.syncTooltipState();
  };

  constructor() {
    effect(() => {
      this.setTooltipContent(this.appTruncatedTooltip());
    });
  }

  ngAfterViewInit(): void {
    this.setTooltipDisabled(true);
    this.elementRef.nativeElement.addEventListener('mouseenter', this.onMouseEnterCapture, true);
  }

  ngOnDestroy(): void {
    this.elementRef.nativeElement.removeEventListener('mouseenter', this.onMouseEnterCapture, true);
  }

  private setTooltipContent(text: string): void {
    const label = text?.trim() ?? '';
    this.tooltip.content = label;
    this.tooltip.setOption({ tooltipLabel: label });
  }

  private setTooltipDisabled(disabled: boolean): void {
    this.tooltip.disabled = disabled;
    this.tooltip.setOption({ disabled });
  }

  private syncTooltipState(): void {
    const element = this.elementRef.nativeElement;
    const text = this.appTruncatedTooltip().trim();

    if (!text || text === '—') {
      this.setTooltipDisabled(true);
      return;
    }

    const isTruncated =
      element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;

    this.setTooltipContent(text);
    this.setTooltipDisabled(!isTruncated);
  }
}
