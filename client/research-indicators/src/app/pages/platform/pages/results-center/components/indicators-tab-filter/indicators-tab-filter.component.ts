import { Component, ViewChild, ElementRef, inject, signal, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ResultsCenterService } from '../../results-center.service';
import { ApiService } from '../../../../../../shared/services/api.service';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
@Component({
  selector: 'app-indicators-tab-filter',
  imports: [CommonModule],
  templateUrl: './indicators-tab-filter.component.html',
  styleUrl: './indicators-tab-filter.component.scss'
})
export class IndicatorsTabFilterComponent implements AfterViewInit, OnDestroy {
  @ViewChild('filtersContainer') filtersContainer!: ElementRef;
  api = inject(ApiService);
  elementRef = inject(ElementRef);
  cache = inject(CacheService);
  resultsCenterService = inject(ResultsCenterService);
  showLeftArrow = signal(false);
  showRightArrow = signal(false);
  private resizeObserver: ResizeObserver | null = null;
  private readonly onWindowResizeForArrows = () => this.updateArrowVisibility();

  indicatorTabs = this.resultsCenterService.api.indicatorTabs.lazy();

  ngAfterViewInit() {
    if (this.filtersContainer) {
      this.filtersContainer.nativeElement.addEventListener('scroll', () => this.updateArrowVisibility());

      // Verify if ResizeObserver is available
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(() => {
          this.updateArrowVisibility();
        });

        this.resizeObserver.observe(this.filtersContainer.nativeElement);
      } else {
        window.addEventListener('resize', this.onWindowResizeForArrows);
      }

      // Initial validation
      this.updateArrowVisibility();
    }

    const sectionSidebar = this.elementRef.nativeElement.querySelector('#section-sidebar');
    if (sectionSidebar) {
      this.resizeObserver = new ResizeObserver(() => {
        const totalHeight = sectionSidebar.getBoundingClientRect().height;
        this.cache.tableFiltersSidebarHeight.set(totalHeight);
      });

      this.resizeObserver.observe(sectionSidebar);
    }
  }

  ngOnDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    // clear the resize event listener if the fallback was used
    if (typeof ResizeObserver === 'undefined') {
      window.removeEventListener('resize', this.onWindowResizeForArrows);
    }
  }

  updateArrowVisibility() {
    const container = this.filtersContainer.nativeElement;
    const hasHorizontalScroll = container.scrollWidth > container.clientWidth;

    if (!hasHorizontalScroll) {
      this.showLeftArrow.set(false);
      this.showRightArrow.set(false);
      return;
    }

    this.showLeftArrow.set(container.scrollLeft > 0);
    this.showRightArrow.set(container.scrollLeft < container.scrollWidth - container.clientWidth);
  }

  scrollLeft() {
    if (this.filtersContainer) {
      const container = this.filtersContainer.nativeElement;
      container.scrollLeft -= 200;
    }
  }

  scrollRight() {
    if (this.filtersContainer) {
      const container = this.filtersContainer.nativeElement;
      container.scrollLeft += 200;
    }
  }
}
