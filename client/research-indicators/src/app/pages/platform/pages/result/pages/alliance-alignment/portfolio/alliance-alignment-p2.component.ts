import { DatePipe } from '@angular/common';
import { Component, Input, WritableSignal, effect, inject, signal, untracked } from '@angular/core';
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

/** A row with no flag is primary: the API defaults a new pick to primary. The API may send 0/1. */
const isPrimaryArea = (area: GetLevers): boolean => area.is_primary == null || Boolean(area.is_primary);

/** Same Research Areas, in the same order and half: ids and primary flags only. */
const sameAreas = (a: GetLevers[], b: GetLevers[]): boolean =>
  a.length === b.length &&
  a.every((area, i) => String(area.lever_id ?? area.id) === String(b[i].lever_id ?? b[i].id) && isPrimaryArea(area) === isPrimaryArea(b[i]));

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

  /**
   * OICRs split Research Areas into primary and contributing, like Create OICR step 2.
   * `body.research_areas` stays the one list the save sends; each field edits its own
   * half through these proxies, and the flag on each row says which half it is in.
   */
  readonly primaryAreas = signal<{ research_areas: GetLevers[] }>({ research_areas: [] });
  readonly contributingAreas = signal<{ research_areas: GetLevers[] }>({ research_areas: [] });
  /** Same rule as the levers: a Research Area picked in one field is disabled in the other. */
  readonly primaryAreasDisabled = signal<GetLevers[]>([]);
  readonly contributingAreasDisabled = signal<GetLevers[]>([]);

  /** body → fields: after a load, or when the custom team name is written back. */
  readonly splitResearchAreasEffect = effect(() => {
    if (!this.isOicrIndicator()) return;
    const areas = this.body?.().research_areas ?? [];
    const primary = areas.filter(isPrimaryArea);
    const contributing = areas.filter(area => !isPrimaryArea(area));
    // Read the fields untracked: a pick must not re-run this and reset the field from the old list.
    untracked(() => {
      if (!sameAreas(primary, this.primaryAreas().research_areas)) this.primaryAreas.set({ research_areas: primary });
      if (!sameAreas(contributing, this.contributingAreas().research_areas)) this.contributingAreas.set({ research_areas: contributing });
    });
    this.contributingAreasDisabled.set(primary);
    this.primaryAreasDisabled.set(contributing);
  });

  /** fields → body: a pick or a removal in either field rewrites the flagged list. */
  readonly mergeResearchAreasEffect = effect(() => {
    const primary = this.primaryAreas().research_areas;
    const contributing = this.contributingAreas().research_areas;
    if (!this.isOicrIndicator()) return;
    const current = untracked(() => this.body().research_areas ?? []);
    const customName = (area: GetLevers) =>
      current.find(row => this.areaKey(row) === this.areaKey(area))?.custom_lever_name ?? area.custom_lever_name;
    const merged = [
      ...primary.map(area => ({ ...area, is_primary: true, custom_lever_name: customName(area) })),
      ...contributing.map(area => ({ ...area, is_primary: false, custom_lever_name: customName(area) }))
    ];
    if (sameAreas(merged, current)) return;
    this.body.update(body => ({ ...body, research_areas: merged }));
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
