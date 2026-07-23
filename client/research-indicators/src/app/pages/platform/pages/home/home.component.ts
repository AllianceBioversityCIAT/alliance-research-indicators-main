import { afterNextRender, Component, computed, DestroyRef, ElementRef, inject, signal, viewChild } from '@angular/core';
import { HeaderComponent } from './components/header/header.component';
import { MainActionsComponent } from './components/main-actions/main-actions.component';
import { DataOverviewComponent } from './components/data-overview/data-overview.component';
import { MyLatestResultsComponent } from './components/my-latest-results/my-latest-results.component';

@Component({
  selector: 'app-home',
  imports: [HeaderComponent, MainActionsComponent, DataOverviewComponent, MyLatestResultsComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export default class HomeComponent {
  private readonly destroyRef = inject(DestroyRef);
  private readonly homeMain = viewChild<ElementRef<HTMLElement>>('homeMain');

  private readonly sidebarDesktopMinPx = 1251;

  private readonly sidebarMaxHeightPx = signal<number | null>(null);

  readonly sidebarMaxHeightCss = computed(() => {
    const px = this.sidebarMaxHeightPx();
    return px == null ? null : `${px}px`;
  });

  constructor() {
    afterNextRender(() => {
      const mainEl = this.homeMain()?.nativeElement;
      if (!mainEl) {
        return;
      }

      const mq = globalThis.matchMedia(`(min-width: ${this.sidebarDesktopMinPx}px)`);

      const update = () => {
        if (!mq.matches) {
          this.sidebarMaxHeightPx.set(null);
          return;
        }
        const h = mainEl.offsetHeight;
        if (h < 1) {
          return;
        }
        this.sidebarMaxHeightPx.set(h);
      };

      const ro = new ResizeObserver(() => update());
      ro.observe(mainEl);
      mq.addEventListener('change', update);
      update();
      globalThis.requestAnimationFrame(() => {
        globalThis.requestAnimationFrame(update);
      });

      this.destroyRef.onDestroy(() => {
        ro.disconnect();
        mq.removeEventListener('change', update);
      });
    });
  }
}
