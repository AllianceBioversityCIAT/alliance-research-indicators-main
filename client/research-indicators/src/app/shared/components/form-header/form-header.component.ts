import { Component, inject, computed } from '@angular/core';
import { VersionSelectorComponent } from '@pages/platform/pages/result/components/version-selector/version-selector.component';
import { CacheService } from '@shared/services/cache/cache.service';

@Component({
  selector: 'app-form-header',
  imports: [VersionSelectorComponent],
  templateUrl: './form-header.component.html'
})
export class FormHeaderComponent {
  cache = inject(CacheService);

  sectionTitle = computed(() => {
    const title = this.cache.currentMetadata().result_title || '';
    const words = title.split(' ');

    if (words.length > 30) {
      return words.slice(0, 30).join(' ') + '...';
    }

    if (title.length > 200) {
      return title.slice(0, 200) + '...';
    }

    return title;
  });
}
