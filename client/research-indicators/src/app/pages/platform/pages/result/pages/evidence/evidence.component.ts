import { Component, inject, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ActionsService } from '../../../../../../shared/services/actions.service';
import { ActivatedRoute, Router } from '@angular/router';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { ApiService } from '../../../../../../shared/services/api.service';
import { Evidence, NotableReference, PatchResultEvidences } from '../../../../../../shared/interfaces/patch-result-evidences.interface';
import { EvidenceItemComponent } from './components/evidence-item/evidence-item.component';
import { SubmissionService } from '@shared/services/submission.service';
import { FormHeaderComponent } from '@shared/components/form-header/form-header.component';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { NavigationButtonsComponent } from '@shared/components/navigation-buttons/navigation-buttons.component';
import { OtherReferenceItemComponent, OtherReferenceItemData } from '../oicr-details/components/other-reference-item/other-reference-item.component';
import { InputComponent } from '@shared/components/custom-fields/input/input.component';

const CGSPACE_HANDLE_URL_PATTERN = /^https:\/\/hdl\.handle\.net\/.+/;

@Component({
  selector: 'app-evidence',
  imports: [ButtonModule, FormHeaderComponent, NavigationButtonsComponent, InputComponent, EvidenceItemComponent, OtherReferenceItemComponent],
  templateUrl: './evidence.component.html'
})
export default class EvidenceComponent {
  actions = inject(ActionsService);
  cache = inject(CacheService);
  router = inject(Router);
  api = inject(ApiService);
  body = signal<PatchResultEvidences>(new PatchResultEvidences());
  loading = signal(false);
  submission = inject(SubmissionService);
  versionWatcher = inject(VersionWatcherService);
  route = inject(ActivatedRoute);
  otherReferences = signal<OtherReferenceItemData[]>([]);

  constructor() {
    this.versionWatcher.onVersionChange(() => this.getData());
  }

  addEvidence() {
    this.body().evidence.push(new Evidence());
  }

  deleteEvidence(index: number) {
    this.body().evidence.splice(index, 1);
    this.actions.saveCurrentSection();
  }

  private setLoading(isLoading: boolean): void {
    this.loading.set(isLoading);
  }

  private navigateTo(path: 'links-to-result' | 'ip-rights' | 'geographic-scope'): void {
    const version = this.route.snapshot.queryParamMap.get('version');
    const queryParams = version ? { version } : undefined;
    this.router.navigate(['result', this.cache.currentResultId(), path], {
      queryParams,
      replaceUrl: true
    });
  }

  async getData(): Promise<void> {
    this.setLoading(true);
    try {
      const response = await this.api.GET_ResultEvidences(this.cache.getCurrentNumericResultId());
      const data = response.data;
      if (!data.evidence || data.evidence.length === 0) {
        data.evidence = [new Evidence()];
      }
      this.body.set(data);
      this.syncOtherReferencesFromApi(data.notable_references);
    } finally {
      this.setLoading(false);
    }
  }

  isCgspaceLinkInvalid(): boolean {
    if (this.cache.currentMetadata().indicator_id !== 5) return false;
    const link = this.body().cgspace_link?.trim();
    return !link;
  }

  isCgspaceLinkFormatInvalid(): boolean {
    if (this.cache.currentMetadata().indicator_id !== 5) return false;
    const link = this.body().cgspace_link?.trim();
    if (!link) return false;
    return !CGSPACE_HANDLE_URL_PATTERN.test(link);
  }

  async saveData(page?: 'next' | 'back'): Promise<void> {
    this.setLoading(true);
    try {
      if (this.submission.isEditableStatus()) {
        const payload = this.buildPayload();
        await this.api.PATCH_ResultEvidences(this.cache.getCurrentNumericResultId(), payload);
        this.actions.showToast({ severity: 'success', summary: 'Evidence', detail: 'Data saved successfully' });
        await this.getData();
      }

      if (page === 'back') {
        if (this.cache.currentMetadata().indicator_id === 5) {
          this.navigateTo('links-to-result');
        } else {
          this.navigateTo('geographic-scope');
        }
      }
      if (page === 'next') {
        this.navigateTo('ip-rights');
      }
    } finally {
      this.setLoading(false);
    }
  }

  addOtherReference() {
    if (!this.submission.isEditableStatus()) return;
    const next = [...this.otherReferences(), { type_id: null, link: '' }];
    this.otherReferences.set(next);
  }

  removeOtherReference(index: number) {
    if (!this.submission.isEditableStatus()) return;
    const next = this.otherReferences().filter((_, i) => i !== index);
    this.otherReferences.set(next);
  }

  updateOtherReference(index: number, data: OtherReferenceItemData) {
    const next = this.otherReferences().map((item, i) => (i === index ? data : item));
    this.otherReferences.set(next);
  }

  private buildPayload(): PatchResultEvidences {
    const snapshot = this.body();
    const notableReferences = this.otherReferences().map<NotableReference>(item => ({
      notable_reference_type_id: item.type_id,
      link: item.link
    }));

    const payload: PatchResultEvidences = {
      ...snapshot,
      evidence: snapshot.evidence,
      notable_references: notableReferences
    };

    if (this.cache.currentMetadata().indicator_id === 5) {
      const link = snapshot.cgspace_link?.trim();
      payload.cgspace_link = link || null;
    }

    return payload;
  }

  private syncOtherReferencesFromApi(references?: NotableReference[]): void {
    if (references && references.length > 0) {
      const mapped = references.map<OtherReferenceItemData>(ref => ({
        type_id: ref.notable_reference_type_id,
        link: ref.link ?? ''
      }));
      this.otherReferences.set(mapped);
      return;
    }

    this.otherReferences.set([]);
  }
}
