import { DatePipe } from '@angular/common';
import { Component, Input, WritableSignal, effect, inject, signal } from '@angular/core';
import { GetAllianceAlignment } from '@shared/interfaces/get-alliance-alignment.interface';
import { GetLeversParams } from '@shared/interfaces/get-levers.interface';
import { CacheService } from '@shared/services/cache/cache.service';
import { SubmissionService } from '@shared/services/submission.service';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { TooltipModule } from 'primeng/tooltip';
import { getContractStatusClasses } from '@shared/constants/status-classes.constants';
import { CustomTagComponent } from '@components/custom-tag/custom-tag.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';
import { GetLevers } from '@shared/interfaces/get-levers.interface';
import { isOtherResearchArea } from './portfolio-2-alignment.mapper';

type CustomNameSignal = WritableSignal<{ custom_lever_name: string }>;

@Component({
  selector: 'app-alliance-alignment-p2',
  imports: [MultiselectComponent, DatePipe, TooltipModule, CustomTagComponent, InputComponent],
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

  readonly isOtherResearchArea = isOtherResearchArea;

  /** One signal per "Other" Research Area, bound to its team-name input. */
  private readonly customNameSignals = new Map<string, CustomNameSignal>();

  /**
   * Copies each typed team name onto its row in `body.research_areas`, which is what
   * the save sends. Creating the signals here (not only from the template) makes the
   * effect read, and so track, every one of them.
   */
  readonly syncCustomNamesEffect = effect(() => {
    const areas = this.body?.().research_areas ?? [];
    const names = new Map<string, string>();
    for (const area of areas.filter(isOtherResearchArea)) {
      const key = this.areaKey(area);
      names.set(key, this.getCustomNameSignal(area)().custom_lever_name ?? '');
    }

    const needsUpdate = areas.some(area => names.has(this.areaKey(area)) && (area.custom_lever_name ?? '') !== names.get(this.areaKey(area)));
    if (!needsUpdate) return;

    this.body.update(current => ({
      ...current,
      research_areas: (current.research_areas ?? []).map(area => {
        const key = this.areaKey(area);
        return names.has(key) ? { ...area, custom_lever_name: names.get(key) } : area;
      })
    }));
  });

  /** Kept per area for the life of the section, so removing and re-picking "Other" keeps the name. */
  getCustomNameSignal(area: GetLevers): CustomNameSignal {
    const key = this.areaKey(area);
    let customName = this.customNameSignals.get(key);
    if (!customName) {
      customName = signal({ custom_lever_name: area.custom_lever_name ?? '' });
      this.customNameSignals.set(key, customName);
    }
    return customName;
  }

  private areaKey(area: GetLevers): string {
    return String(area.lever_id ?? area.id);
  }

  isOicrIndicator(): boolean {
    return Number(this.cache.currentMetadata()?.indicator_id) === 5;
  }
}
