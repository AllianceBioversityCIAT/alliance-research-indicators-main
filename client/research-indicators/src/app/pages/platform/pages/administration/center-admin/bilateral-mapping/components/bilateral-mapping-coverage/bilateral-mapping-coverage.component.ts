// @akili-spec docs/specs/bilateral/clarisa-automapper-s2 — T-06 / R-CAM-004 AC.4, design.md §6.1, DD-6
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { SkeletonModule } from 'primeng/skeleton';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { BilateralMappingService } from '@services/bilateral-mapping.service';
import { AutomapperCoverage } from '@interfaces/bilateral/bilateral-project-mapping.interface';

@Component({
  selector: 'app-bilateral-mapping-coverage',
  standalone: true,
  imports: [CommonModule, SkeletonModule, ButtonModule, TooltipModule],
  templateUrl: './bilateral-mapping-coverage.component.html',
  styleUrl: './bilateral-mapping-coverage.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BilateralMappingCoverageComponent implements OnInit {
  private readonly service = inject(BilateralMappingService);

  /** Target CLARISA phase (defaults to 2026). */
  readonly phase = input<number>(2026);

  /** Emitted when the admin clicks the "Auto-map" button. */
  readonly openAutomapper = output<void>();

  // State signals
  readonly coverage = signal<AutomapperCoverage | null>(null);
  readonly loading = signal(true);
  readonly error = signal(false);

  /**
   * Percentage mapped against reachable cohort.
   * Computed as Math.round((mapped / reachable) * 100) or 0 when reachable is 0.
   */
  readonly coveragePercentage = computed(() => {
    const cov = this.coverage();
    if (!cov || cov.reachable <= 0) return 0;
    return Math.round((cov.mapped / cov.reachable) * 100);
  });

  /**
   * Printed denominator string (R-CAM-004 AC.4 / Hard Requirement 1).
   * Example: "Coverage 4 / 198 · 2% (eligible CLARISA projects, phase 2026)"
   * The figure must not be quotable without the denominator context.
   */
  readonly denominatorText = computed(() => {
    const cov = this.coverage();
    if (!cov) return '';
    const pct = this.coveragePercentage();
    return `Coverage ${cov.mapped} / ${cov.reachable} · ${pct}% (eligible CLARISA projects, phase ${this.phase()})`;
  });

  ngOnInit(): void {
    void this.loadCoverage();
  }

  /**
   * Loads coverage figures from the server.
   * On failure, enters error state without throwing.
   */
  async loadCoverage(): Promise<void> {
    this.loading.set(true);
    this.error.set(false);

    const result = await this.service.getCoverage(this.phase());

    if (result === null) {
      this.error.set(true);
      this.coverage.set(null);
    } else {
      this.coverage.set(result);
    }
    this.loading.set(false);
  }

  onTriggerAutoMap(): void {
    this.openAutomapper.emit();
  }
}
