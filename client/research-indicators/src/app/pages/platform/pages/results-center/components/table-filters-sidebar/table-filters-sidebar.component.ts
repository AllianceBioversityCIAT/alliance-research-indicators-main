import { Component, inject, Input, output, signal, ViewChild, AfterViewInit, ElementRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { MultiselectComponent } from '../../../../../../shared/components/custom-fields/multiselect/multiselect.component';
import { ResultsCenterService } from '../../results-center.service';
import { TooltipModule } from 'primeng/tooltip';
import { getContractStatusClasses } from '@shared/constants/status-classes.constants';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

@Component({
  selector: 'app-table-filters-sidebar',
  imports: [FormsModule, ButtonModule, MultiselectComponent, TooltipModule, S3ImageUrlPipe],
  templateUrl: './table-filters-sidebar.component.html',
  styleUrl: './table-filters-sidebar.component.scss'
})
export class TableFiltersSidebarComponent implements AfterViewInit {
  @ViewChild('indicatorSelect') indicatorSelect?: MultiselectComponent;
  @ViewChild('statusSelect') statusSelect?: MultiselectComponent;
  @ViewChild('projectSelect') projectSelect?: MultiselectComponent;
  @ViewChild('leverSelect') leverSelect?: MultiselectComponent;
  @ViewChild('yearSelect') yearSelect?: MultiselectComponent;
  @ViewChild('containerRef') containerRef!: ElementRef;

  resultsCenterService = inject(ResultsCenterService);
  getContractStatusClasses = getContractStatusClasses;

  @Input() showSignal = signal(false);
  @Input() confirmSidebarEvent = output<void>();
  @Input() indicatorHiddenIds: number[] = [];
  @Input() forceIndicatorFilter = false;
  @Input() hideProjectFilter = false;

  indicatorOptionFilter = (indicator: { indicator_id?: number } | null) => {
    if (indicator?.indicator_id == null) return true;
    const id = Number(indicator.indicator_id);
    if (Number.isNaN(id)) return true;
    return !this.indicatorHiddenIds.includes(id);
  };

  toggleSidebar() {
    this.showSignal.update(prev => !prev);
  }

  ngAfterViewInit() {
    this.resultsCenterService.multiselectRefs.set({
      indicator: this.indicatorSelect!,
      status: this.statusSelect!,
      project: this.projectSelect!,
      lever: this.leverSelect!,
      year: this.yearSelect!
    });
  }
}
