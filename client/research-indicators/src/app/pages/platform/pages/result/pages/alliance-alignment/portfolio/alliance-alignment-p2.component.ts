import { DatePipe } from '@angular/common';
import { Component, Input, WritableSignal, inject } from '@angular/core';
import { GetAllianceAlignment } from '@shared/interfaces/get-alliance-alignment.interface';
import { GetLeversParams } from '@shared/interfaces/get-levers.interface';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { TooltipModule } from 'primeng/tooltip';
import { getContractStatusClasses } from '@shared/constants/status-classes.constants';
import { CustomTagComponent } from '@components/custom-tag/custom-tag.component';

/** Research Area "Other" (migration 1790688406000) — only chosen, with a team name, in Create OICR step 2. */
const OTHER_RESEARCH_AREA_ID = 18;

@Component({
  selector: 'app-alliance-alignment-p2',
  imports: [MultiselectComponent, DatePipe, TooltipModule, CustomTagComponent],
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
    return [4, 5, 6].includes(indicatorId);
  }

  /**
   * Hides the "Other" Research Area: this section has no field for its team name.
   * An OICR that already carries it still shows it — app-multiselect re-adds any
   * selected option a filter hides.
   */
  readonly researchAreaOptionFilter = (option: { lever_id?: number | string; id?: number | string }): boolean =>
    Number(option?.lever_id ?? option?.id) !== OTHER_RESEARCH_AREA_ID;

  isOicrIndicator(): boolean {
    return Number(this.cache.currentMetadata()?.indicator_id) === 5;
  }
}
