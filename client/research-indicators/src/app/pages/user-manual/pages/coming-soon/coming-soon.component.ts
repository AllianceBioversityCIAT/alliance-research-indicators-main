import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { findManualModule, MANUAL_MODULES } from '../../data/manual-modules';

/** Placeholder page for a manual module that is mapped but not written yet. */
@Component({
  selector: 'app-manual-coming-soon',
  imports: [RouterLink],
  templateUrl: './coming-soon.component.html'
})
export default class ComingSoonComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly params = toSignal(this.route.paramMap);

  readonly module = computed(() => findManualModule(this.params()?.get('slug') ?? ''));
  readonly published = MANUAL_MODULES.filter(m => m.status === 'published');
}
