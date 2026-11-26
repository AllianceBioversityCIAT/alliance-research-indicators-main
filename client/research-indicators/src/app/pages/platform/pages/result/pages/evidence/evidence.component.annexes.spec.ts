import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { ActionsService } from '@shared/services/actions.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ApiService } from '@shared/services/api.service';
import { SubmissionService } from '@shared/services/submission.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import EvidenceComponent from './evidence.component';
import { actionsServiceMock, cacheServiceMock, apiServiceMock, submissionServiceMock } from 'src/app/testing/mock-services.mock';

describe('EvidenceComponent annexes (2026 OICR)', () => {
  let fixture: ComponentFixture<EvidenceComponent>;
  let component: EvidenceComponent;
  let metadata: ReturnType<typeof signal<{ indicator_id: number; report_year?: number; status_id: number }>>;
  let api: { GET_ResultEvidences: jest.Mock; PATCH_ResultEvidences: jest.Mock };
  let editable: jest.Mock;

  const stored = [
    { id: 11, annex_type_id: 1, description: 'Field day', photo_credits: 'Jane', file_type: null, partner_consent: null, link: 'https://a.org/p' },
    { id: 12, annex_type_id: 3, description: 'ILRI', photo_credits: null, file_type: null, partner_consent: 'Yes', link: 'https://a.org/l' }
  ];
  const el = (): HTMLElement => fixture.nativeElement;
  const annexesBlock = () => el().querySelector('[data-testid="annexes-block"]');
  const lastPayload = () => api.PATCH_ResultEvidences.mock.calls[api.PATCH_ResultEvidences.mock.calls.length - 1][1];

  beforeEach(async () => {
    metadata = signal({ indicator_id: 1, report_year: 2026, status_id: 4 });
    editable = jest.fn().mockReturnValue(true);
    api = {
      GET_ResultEvidences: jest.fn().mockResolvedValue({
        data: { evidence: [{ evidence_url: 'u', evidence_description: 'd' }], notable_references: [], cgspace_link: null, annexes: stored }
      }),
      PATCH_ResultEvidences: jest.fn().mockResolvedValue({ data: {} })
    };
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, EvidenceComponent],
      providers: [
        { provide: ActionsService, useValue: { ...actionsServiceMock, showToast: jest.fn(), saveCurrentSection: jest.fn() } },
        {
          provide: CacheService,
          useValue: { ...cacheServiceMock, currentMetadata: metadata, currentResultId: jest.fn(() => 123), currentResultIsLoading: () => false, getCurrentNumericResultId: () => 123 }
        },
        { provide: ApiService, useValue: { ...apiServiceMock, ...api } },
        { provide: SubmissionService, useValue: { ...submissionServiceMock, isEditableStatus: editable } },
        { provide: VersionWatcherService, useValue: { onVersionChange: jest.fn() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: () => null } } } },
        { provide: Router, useValue: { navigate: jest.fn() } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(EvidenceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('year gate', () => {
    it('non-OICR: no Annexes block and no annexes key in the payload', async () => {
      await component.getData();
      fixture.detectChanges();
      expect(annexesBlock()).toBeNull();
      await component.saveData();
      expect('annexes' in lastPayload()).toBe(false);
    });

    it('2025 OICR: no Annexes block and no annexes key, even though the GET returned annexes', async () => {
      metadata.set({ indicator_id: 5, report_year: 2025, status_id: 4 });
      await component.getData();
      fixture.detectChanges();
      expect(annexesBlock()).toBeNull();
      await component.saveData();
      expect('annexes' in lastPayload()).toBe(false);
    });

    it('2026 OICR: shows the block with the helper text and the stored annexes', async () => {
      metadata.set({ indicator_id: 5, report_year: 2026, status_id: 4 });
      await component.getData();
      fixture.detectChanges();
      expect(annexesBlock()).not.toBeNull();
      expect(annexesBlock()?.textContent).toContain('Do not upload any items here;');
      expect(el().querySelectorAll('app-oicr-annex-item').length).toBe(2);
      expect(el().textContent).toContain('Add annex');
    });

    it('transitions from 2025 to 2026 on the same page', async () => {
      metadata.set({ indicator_id: 5, report_year: 2025, status_id: 4 });
      await component.getData();
      fixture.detectChanges();
      expect(annexesBlock()).toBeNull();
      metadata.set({ indicator_id: 5, report_year: 2026, status_id: 4 });
      fixture.detectChanges();
      expect(annexesBlock()).not.toBeNull();
    });
  });

  describe('2026 OICR', () => {
    beforeEach(async () => {
      metadata.set({ indicator_id: 5, report_year: 2026, status_id: 4 });
      await component.getData();
      fixture.detectChanges();
    });

    it('loads annexes from the GET (empty array when none)', async () => {
      expect(component.annexes().map(a => a.id)).toEqual([11, 12]);
      api.GET_ResultEvidences.mockResolvedValueOnce({ data: { evidence: [], annexes: [] } });
      await component.getData();
      expect(component.annexes()).toEqual([]);
      api.GET_ResultEvidences.mockResolvedValueOnce({ data: { evidence: [] } });
      await component.getData();
      expect(component.annexes()).toEqual([]);
    });

    it('adds an annex through the button and removes one', () => {
      const button = Array.from(el().querySelectorAll('button')).find(b => b.textContent?.includes('Add annex')) as HTMLButtonElement;
      button.click();
      fixture.detectChanges();
      expect(component.annexes().length).toBe(3);
      expect(el().querySelectorAll('app-oicr-annex-item').length).toBe(3);
      component.removeAnnex(0);
      fixture.detectChanges();
      expect(component.annexes().map(a => a.id)).toEqual([12, undefined]);
    });

    it('does not add or remove when not editable', () => {
      editable.mockReturnValue(false);
      component.addAnnex();
      component.removeAnnex(0);
      expect(component.annexes().length).toBe(2);
    });

    it('sends loaded rows with id and new rows without id, only the fields of their type', async () => {
      component.addAnnex();
      component.updateAnnex(2, { annex_type_id: 2, description: 'Map of sites', photo_credits: 'stale', file_type: 'Map', partner_consent: null, link: 'https://a.org/m' });
      await component.saveData();
      expect(lastPayload().annexes).toEqual([
        { id: 11, annex_type_id: 1, description: 'Field day', photo_credits: 'Jane', link: 'https://a.org/p' },
        { id: 12, annex_type_id: 3, description: 'ILRI', partner_consent: 'Yes', link: 'https://a.org/l' },
        { annex_type_id: 2, description: 'Map of sites', file_type: 'Map', link: 'https://a.org/m' }
      ]);
      expect('id' in lastPayload().annexes[2]).toBe(false);
    });

    it('omits rows whose type was never chosen and sends an empty array when all are removed', async () => {
      component.addAnnex();
      await component.saveData();
      expect(lastPayload().annexes.length).toBe(2);
      component.annexes.set([]);
      await component.saveData();
      expect(lastPayload().annexes).toEqual([]);
    });

    it('type change inside a card flows into the payload with the second field cleared', async () => {
      fixture.detectChanges();
      const items = el().querySelectorAll('app-oicr-annex-item');
      expect(items.length).toBe(2);
      component.updateAnnex(0, { ...stored[0], annex_type_id: 2, photo_credits: null, file_type: null });
      await component.saveData();
      expect(lastPayload().annexes[0]).toEqual({ id: 11, annex_type_id: 2, description: 'Field day', file_type: null, link: 'https://a.org/p' });
    });
  });
});
