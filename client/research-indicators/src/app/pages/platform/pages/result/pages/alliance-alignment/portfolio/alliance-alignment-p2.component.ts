import { DatePipe } from '@angular/common';
import { Component, Input, WritableSignal, inject } from '@angular/core';
import { GetAllianceAlignment } from '@shared/interfaces/get-alliance-alignment.interface';
import { GetLeversParams } from '@shared/interfaces/get-levers.interface';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { TooltipModule } from 'primeng/tooltip';
import { getContractStatusClasses } from '@shared/constants/status-classes.constants';

@Component({
  selector: 'app-alliance-alignment-p2',
  imports: [MultiselectComponent, DatePipe, TooltipModule],
  templateUrl: './alliance-alignment-p2.component.html'
})
export class AllianceAlignmentP2Component {
  @Input({ required: true }) body!: WritableSignal<GetAllianceAlignment>;
  @Input() serviceParams: GetLeversParams | undefined;
  @Input() getShortDescription: (description: string) => string = description => description;
  @Input() canRemove: (item: unknown) => boolean = () => true;
  @Input() contractServiceParams: Record<string, unknown> = {};
  @Input() markAsPrimary: (
    item: { is_primary: boolean; contract_id?: string | number; lever_id?: string | number; sdg_id?: number },
    type: 'contract' | 'lever' | 'sdg'
  ) => void = () => undefined;

  readonly submission = inject(SubmissionService);
  readonly cache = inject(CacheService);
  readonly getContractStatusClasses = getContractStatusClasses;

  shouldShowImpactOutcomes(): boolean {
    const indicatorId = Number(this.cache.currentMetadata()?.indicator_id);
    return indicatorId === 4 || indicatorId === 5;
  }

  isOicrIndicator(): boolean {
    return Number(this.cache.currentMetadata()?.indicator_id) === 5;
  }
}
