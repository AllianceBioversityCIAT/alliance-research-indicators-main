import { ChangeDetectorRef, Component, Input, signal, WritableSignal, inject, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MultiSelectModule, MultiSelect } from 'primeng/multiselect';
import { RadioButtonComponent } from '@shared/components/custom-fields/radio-button/radio-button.component';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { GlobalTargetsService } from '@shared/services/short-control-list/global-targets.service';
import { ImpactAreasService } from '@shared/services/short-control-list/impact-areas.service';
import { ResultImpactArea, ImpactAreasBody, BaseService } from '@shared/interfaces/impact-area.interface';
import { GlobalTarget } from '@shared/interfaces/global-target.interface';

@Component({
  selector: 'app-impact-areas',
  standalone: true,
  imports: [RadioButtonComponent, FormsModule, MultiSelectModule],
  templateUrl: './impact-areas.component.html'
})
export class ImpactAreasComponent {
  @Input() body: WritableSignal<ImpactAreasBody> = signal({});
  @Input() disabled = false;

  private readonly cdr = inject(ChangeDetectorRef);
  serviceLocator = inject(ServiceLocatorService);
  impactAreasService = this.serviceLocator.getService('impactAreas') as BaseService & ImpactAreasService;
  private readonly globalTargetsService = inject(GlobalTargetsService);
  private readonly impactAreasForLoad = inject(ImpactAreasService);

  private readonly globalTargetIdLists = new Map<number, WritableSignal<number[]>>();
  private readonly impactAreaScoreSignals = new Map<number, WritableSignal<{ score: number | null }>>();
  private readonly globalTargetPanelWidthsPx = signal<Record<number, number>>({});

  constructor() {
    effect(() => {
      for (const a of this.impactAreasForLoad.list()) {
        void this.globalTargetsService.main(a.id);
      }
    });

    effect(() => {
      const body = this.body();
      if (body.result_impact_areas) {
        for (const impactArea of body.result_impact_areas) {
          const areaId = impactArea.impact_area_id;
          const impactAreaScoreId = impactArea.impact_area_score_id;

          if (areaId) {
            const idsSignal = this.ensureGlobalTargetIdsSignal(areaId);
            idsSignal.set(this.idsFromImpactArea(impactArea));

            const scoreSignal = this.ensureImpactAreaScoreSignal(areaId);
            scoreSignal.set({ score: impactAreaScoreId ?? null });
          }
        }
      }
    });
  }

  private idsFromImpactArea(ia: ResultImpactArea): number[] {
    if (Array.isArray(ia.result_impact_area_global_targets) && ia.result_impact_area_global_targets.length > 0) {
      return ia.result_impact_area_global_targets.map(t => t.global_target_id);
    }
    return [];
  }

  isGlobalTargetRequired(areaId: number): boolean {
    const impactArea = this.body().result_impact_areas?.find((i: ResultImpactArea) => i.impact_area_id === areaId);
    return impactArea?.impact_area_score_id === 3;
  }

  isGlobalTargetInvalid(areaId: number): boolean {
    return this.isGlobalTargetRequired(areaId) && this.ensureGlobalTargetIdsSignal(areaId)().length === 0;
  }

  globalTargetPanelStyle(areaId: number): Record<string, string> {
    const w = this.globalTargetPanelWidthsPx()[areaId];
    const base: Record<string, string> = { boxSizing: 'border-box' };
    if (w == null || w <= 0) {
      return base;
    }
    return {
      ...base,
      width: `${w}px`,
      maxWidth: `${w}px`,
      minWidth: `${w}px`
    };
  }

  onGlobalTargetPanelOpen(areaId: number, ms: MultiSelect, trigger: HTMLElement) {
    const w = Math.round(trigger.getBoundingClientRect().width);
    if (w <= 0) {
      return;
    }
    this.globalTargetPanelWidthsPx.update(prev => ({ ...prev, [areaId]: w }));
    this.cdr.detectChanges();
    setTimeout(() => {
      ms.overlayViewChild?.alignOverlay();
    });
  }

  getImpactAreaScore(areaId: number): WritableSignal<{ score: number | null }> {
    return this.ensureImpactAreaScoreSignal(areaId);
  }

  getGlobalTargetIdsSignal(areaId: number): WritableSignal<number[]> {
    return this.ensureGlobalTargetIdsSignal(areaId);
  }

  globalTargetOptions(areaId: number) {
    return this.globalTargetsService.getList(areaId)();
  }

  globalTargetLoading(areaId: number): boolean {
    return this.globalTargetsService.getLoading(areaId)();
  }

  selectedGlobalTargetRows(areaId: number): GlobalTarget[] {
    const ids = this.ensureGlobalTargetIdsSignal(areaId)();
    const options = this.globalTargetOptions(areaId) ?? [];
    return ids.map(id => {
      const opt = options.find(o => o.targetId === id);
      return opt ?? ({ targetId: id, smo_code: '', target: '', impactAreaId: areaId, impactAreaName: '' } as GlobalTarget);
    });
  }

  removeGlobalTargetRow(areaId: number, targetId: number) {
    const next = this.ensureGlobalTargetIdsSignal(areaId)().filter(id => id !== targetId);
    this.onGlobalTargetIdsChange(areaId, next);
  }

  onGlobalTargetIdsChange(areaId: number, value: number[] | null) {
    const ids = Array.isArray(value) ? value : [];
    this.ensureGlobalTargetIdsSignal(areaId).set(ids);

    const currentBody = this.body();
    currentBody.result_impact_areas ??= [];
    let row = currentBody.result_impact_areas.find((ia: ResultImpactArea) => ia.impact_area_id === areaId);
    if (row === undefined) {
      row = {
        impact_area_id: areaId,
        impact_area_score_id: undefined,
        result_impact_area_global_targets: undefined
      };
      currentBody.result_impact_areas.push(row);
    }
    row.result_impact_area_global_targets = ids.length > 0 ? ids.map(global_target_id => ({ global_target_id })) : undefined;

    this.body.set({ ...currentBody });
  }

  onScoreChange(areaId: number, value: number) {
    const currentBody = this.body();
    currentBody.result_impact_areas ??= [];
    let impactArea = currentBody.result_impact_areas.find((ia: ResultImpactArea) => ia.impact_area_id === areaId);
    if (impactArea === undefined) {
      impactArea = {
        impact_area_id: areaId,
        impact_area_score_id: value,
        result_impact_area_global_targets: undefined
      };
      currentBody.result_impact_areas.push(impactArea);
    } else {
      impactArea.impact_area_score_id = value;
    }

    this.updateImpactAreaScoreSignal(areaId, value);
    this.body.set({ ...currentBody });
  }

  private ensureGlobalTargetIdsSignal(areaId: number): WritableSignal<number[]> {
    if (!this.globalTargetIdLists.has(areaId)) {
      const ia = this.body().result_impact_areas?.find((i: ResultImpactArea) => i.impact_area_id === areaId);
      const initial = ia ? this.idsFromImpactArea(ia) : [];
      this.globalTargetIdLists.set(areaId, signal<number[]>(initial));
    }
    return this.globalTargetIdLists.get(areaId)!;
  }

  private ensureImpactAreaScoreSignal(areaId: number): WritableSignal<{ score: number | null }> {
    if (!this.impactAreaScoreSignals.has(areaId)) {
      const impactArea = this.body().result_impact_areas?.find((ia: ResultImpactArea) => ia.impact_area_id === areaId);
      const initialScore = impactArea?.impact_area_score_id ?? null;
      this.impactAreaScoreSignals.set(areaId, signal({ score: initialScore }));
    }
    return this.impactAreaScoreSignals.get(areaId)!;
  }

  private updateImpactAreaScoreSignal(areaId: number, score: number | null) {
    this.ensureImpactAreaScoreSignal(areaId).set({ score });
  }
}
