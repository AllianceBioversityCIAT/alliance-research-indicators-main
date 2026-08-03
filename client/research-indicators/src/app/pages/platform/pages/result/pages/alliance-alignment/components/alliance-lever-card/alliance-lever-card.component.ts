import { Component, Input, output, WritableSignal } from '@angular/core';
import { Lever, LeverStrategicOutcome } from '@shared/interfaces/oicr-creation.interface';
import { GetSdgs } from '@shared/interfaces/get-sdgs.interface';
import { ResultLeverSdgTargetPayload } from '@shared/interfaces/lever-sdg-target.interface';
import { MultiselectComponent } from '@shared/components/custom-fields/multiselect/multiselect.component';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-alliance-lever-card',
  standalone: true,
  imports: [MultiselectComponent, TooltipModule],
  templateUrl: './alliance-lever-card.component.html',
  styleUrl: './alliance-lever-card.component.scss'
})
export class AllianceLeverCardComponent {
  private readonly otherLeverId = 9;
  readonly allowRemove = (): boolean => true;
  readonly selectedItemsSurfaceColor = '#E8EBED';

  removeLever = output<void>();

  @Input() removeLocked = false;
  @Input({ required: true }) lever!: Lever;
  @Input({ required: true }) sdgSignal!: WritableSignal<{
    result_lever_sdgs: GetSdgs[];
    result_lever_sdg_targets: ResultLeverSdgTargetPayload[];
  }>;
  @Input({ required: true }) outcomeSignal!: WritableSignal<{ result_lever_strategic_outcomes: LeverStrategicOutcome[] }>;
  @Input() showStrategicOutcomes = false;
  @Input() strategicOutcomesRequired = false;
  @Input() sdgTargetsRequired = true;
  @Input() disabled = false;

  isOtherLever(): boolean {
    return Number(this.lever?.lever_id) === this.otherLeverId;
  }
}
