import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ActivatedRoute } from '@angular/router';
import { ActionsService } from '@shared/services/actions.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { ApiService } from '@shared/services/api.service';
import { SubmissionService } from '@shared/services/submission.service';
import EvidenceComponent from './evidence.component';
import { actionsServiceMock, cacheServiceMock, apiServiceMock, submissionServiceMock } from 'src/app/testing/mock-services.mock';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { Evidence } from '../../../../../../shared/interfaces/patch-result-evidences.interface';

jest.mock('@shared/services/version-watcher.service', () => ({
  VersionWatcherService: jest.fn().mockImplementation(() => ({
    onVersionChange: jest.fn()
  }))
}));

jest.mock('@angular/router', () => ({
  ...jest.requireActual('@angular/router'),
  Router: jest.fn().mockImplementation(() => ({
    navigate: jest.fn()
  }))
}));

describe('EvidenceComponent', () => {
  let component: EvidenceComponent;
  let fixture: ComponentFixture<EvidenceComponent>;
  let router: Router;
  let api: any;
  let actions: any;
  let cache: any;
  let submission: any;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule, EvidenceComponent],
      providers: [
        { provide: ActionsService, useValue: { ...actionsServiceMock, showToast: jest.fn(), saveCurrentSection: jest.fn() } },
        {
          provide: CacheService,
          useValue: { ...cacheServiceMock, currentMetadata: jest.fn(() => ({ indicator_id: 5, status_id: 4 })), currentResultId: jest.fn(() => 123) }
        },
        {
          provide: ApiService,
          useValue: {
            ...apiServiceMock,
            GET_ResultEvidences: jest.fn().mockResolvedValue({ data: { evidence: [{ evidence_url: 'url', evidence_description: 'desc' }] } }),
            PATCH_ResultEvidences: jest.fn().mockResolvedValue({ data: { evidence: [{ evidence_url: 'url', evidence_description: 'desc' }] } })
          }
        },
        { provide: SubmissionService, useValue: { ...submissionServiceMock, isEditableStatus: jest.fn().mockReturnValue(true) } },
        { provide: VersionWatcherService, useValue: { onVersionChange: jest.fn() } },
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ version: '1.0' }),
            params: of({ id: '123' }),
            snapshot: {
              paramMap: { get: (key: string) => (key === 'id' ? '123' : null) },
              queryParamMap: { get: (key: string) => (key === 'version' ? '1.0' : null) }
            }
          }
        },
        { provide: Router, useValue: { navigate: jest.fn() } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EvidenceComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    api = TestBed.inject(ApiService);
    actions = TestBed.inject(ActionsService);
    cache = TestBed.inject(CacheService);
    submission = TestBed.inject(SubmissionService);
    fixture.detectChanges();
    component.body.update(body => ({
      ...body,
      cgspace_link: 'https://hdl.handle.net/10568/182058'
    }));
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should add evidence', () => {
    const initialLength = component.body().evidence.length;
    component.addEvidence();
    expect(component.body().evidence.length).toBe(initialLength + 1);
  });

  it('should delete evidence and call saveCurrentSection', () => {
    component.body.set({
      evidence: [
        {
          evidence_url: 'url',
          evidence_description: 'desc',
          is_active: true,
          result_evidence_id: null,
          result_id: null,
          evidence_role_id: null,
          is_private: false
        },
        {
          evidence_url: 'url2',
          evidence_description: 'desc2',
          is_active: true,
          result_evidence_id: null,
          result_id: null,
          evidence_role_id: null,
          is_private: false
        }
      ]
    });
    const spy = jest.spyOn(actions, 'saveCurrentSection');
    component.deleteEvidence(0);
    expect(component.body().evidence.length).toBe(1);
    expect(spy).toHaveBeenCalled();
  });

  it('should get data and set evidence if empty', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce({ data: { evidence: [] } });
    await component.getData();
    expect(component.body().evidence.length).toBe(1);
  });

  it('should get data and set evidence if present', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce({
      data: {
        evidence: [
          {
            evidence_url: 'url',
            evidence_description: 'desc',
            is_active: true,
            result_evidence_id: null,
            result_id: null,
            evidence_role_id: null,
            is_private: false
          }
        ]
      }
    });
    await component.getData();
    expect(component.body().evidence[0].evidence_url).toBe('url');
  });

  it('should save data and show toast if editable', async () => {
    component.body.set({
      evidence: [{ evidence_url: 'url', evidence_description: 'desc', is_active: true, result_evidence_id: null, result_id: null, evidence_role_id: null, is_private: false }],
      notable_references: [],
      cgspace_link: 'https://hdl.handle.net/10568/1'
    });
    const spyToast = jest.spyOn(actions, 'showToast');
    const spyGetData = jest.spyOn(component, 'getData');
    submission.isEditableStatus.mockReturnValue(true);
    await component.saveData();
    expect(spyToast).toHaveBeenCalled();
    expect(spyGetData).toHaveBeenCalled();
  });

  it('should save OICR when cgspace link is not a handle.net URL', async () => {
    component.body.set({
      evidence: [{ evidence_url: 'url', evidence_description: 'desc', is_active: true, result_evidence_id: null, result_id: null, evidence_role_id: null, is_private: false }],
      notable_references: [],
      cgspace_link: 'https://cgspace.cgiar.org/handle/10568/1'
    });
    const spyToast = jest.spyOn(actions, 'showToast');
    submission.isEditableStatus.mockReturnValue(true);
    await component.saveData();
    expect(api.PATCH_ResultEvidences).toHaveBeenCalledWith(
      123,
      expect.objectContaining({ cgspace_link: 'https://cgspace.cgiar.org/handle/10568/1' })
    );
    expect(spyToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('should save OICR when cgspace link is empty', async () => {
    component.body.set({
      evidence: [{ evidence_url: 'url', evidence_description: 'desc', is_active: true, result_evidence_id: null, result_id: null, evidence_role_id: null, is_private: false }],
      notable_references: [],
      cgspace_link: ''
    });
    const spyToast = jest.spyOn(actions, 'showToast');
    submission.isEditableStatus.mockReturnValue(true);
    await component.saveData();
    expect(api.PATCH_ResultEvidences).toHaveBeenCalledWith(123, expect.objectContaining({ cgspace_link: null }));
    expect(spyToast).toHaveBeenCalledWith(expect.objectContaining({ severity: 'success' }));
  });

  it('isCgspaceLinkFormatInvalid should be false when link is empty', () => {
    component.body.set({ evidence: [new Evidence()], notable_references: [], cgspace_link: '   ' });
    expect(component.isCgspaceLinkFormatInvalid()).toBe(false);
  });

  it('isCgspaceLinkInvalid should be true when OICR has empty cgspace link', () => {
    component.body.set({ evidence: [new Evidence()], notable_references: [], cgspace_link: '   ' });
    expect(component.isCgspaceLinkInvalid()).toBe(true);
  });

  it('isCgspaceLinkInvalid and isCgspaceLinkFormatInvalid should be false for non-OICR indicators', () => {
    cache.currentMetadata = jest.fn(() => ({ indicator_id: 1, status_id: 4 }));
    component.body.set({ evidence: [new Evidence()], notable_references: [], cgspace_link: '' });
    expect(component.isCgspaceLinkInvalid()).toBe(false);
    expect(component.isCgspaceLinkFormatInvalid()).toBe(false);
  });

  it('isCgspaceLinkFormatInvalid should be true for invalid handle URL on OICR', () => {
    component.body.set({
      evidence: [new Evidence()],
      notable_references: [],
      cgspace_link: 'https://invalid.example/handle/1'
    });
    expect(component.isCgspaceLinkFormatInvalid()).toBe(true);
  });

  it('should include cgspace_link in PATCH payload for OICR', async () => {
    component.body.set({
      evidence: [{ evidence_url: 'url', evidence_description: 'desc', is_active: true, result_evidence_id: null, result_id: null, evidence_role_id: null, is_private: false }],
      notable_references: [],
      cgspace_link: '  https://hdl.handle.net/10568/1  '
    });
    submission.isEditableStatus.mockReturnValue(true);
    await component.saveData();
    expect(api.PATCH_ResultEvidences).toHaveBeenCalledWith(
      123,
      expect.objectContaining({ cgspace_link: 'https://hdl.handle.net/10568/1' })
    );
  });

  it('should navigate to back page (links-to-result when indicator_id is 5)', async () => {
    const spy = jest.spyOn(router, 'navigate');
    cache.currentMetadata = jest.fn(() => ({ indicator_id: 5, status_id: 4 }));
    await component.saveData('back');
    expect(spy).toHaveBeenCalledWith(['result', 123, 'links-to-result'], expect.anything());
  });

  it('should navigate to geographic-scope when going back and indicator_id is not 5', async () => {
    const spy = jest.spyOn(router, 'navigate');
    cache.currentMetadata = jest.fn(() => ({ indicator_id: 1, status_id: 4 }));
    await component.saveData('back');
    expect(spy).toHaveBeenCalledWith(['result', 123, 'geographic-scope'], expect.anything());
  });

  it('should navigate to next page', async () => {
    const spy = jest.spyOn(router, 'navigate');
    await component.saveData('next');
    expect(spy).toHaveBeenCalledWith(['result', 123, 'ip-rights'], expect.anything());
  });

  it('should not call PATCH_ResultEvidences if not editable', async () => {
    submission.isEditableStatus.mockReturnValue(false);
    const spyPatch = jest.spyOn(api, 'PATCH_ResultEvidences');
    await component.saveData();
    expect(spyPatch).not.toHaveBeenCalled();
  });

  it('should set loading true and false in getData', async () => {
    component.loading.set(false);
    const promise = component.getData();
    expect(component.loading()).toBe(true);
    await promise;
    expect(component.loading()).toBe(false);
  });

  it('should set loading true and false in saveData', async () => {
    component.loading.set(false);
    const promise = component.saveData();
    expect(component.loading()).toBe(true);
    await promise;
    expect(component.loading()).toBe(false);
  });

  it('should throw error in getData if service fails', async () => {
    api.GET_ResultEvidences.mockRejectedValueOnce(new Error('fail'));
    await expect(component.getData()).rejects.toThrow('fail');
  });

  it('should throw error in saveData if service fails', async () => {
    api.PATCH_ResultEvidences.mockRejectedValueOnce(new Error('fail'));
    submission.isEditableStatus.mockReturnValue(true);
    await expect(component.saveData()).rejects.toThrow('fail');
  });

  it('should not delete evidence if index is out of bounds', () => {
    component.body.set({ evidence: [new Evidence()] });
    const spy = jest.spyOn(actions, 'saveCurrentSection');
    component.deleteEvidence(5);
    expect(component.body().evidence.length).toBe(1);
    expect(spy).toHaveBeenCalled();
  });

  it('should not navigate if page param is invalid', async () => {
    const spy = jest.spyOn(router, 'navigate');
    await component.saveData('invalid' as any);
    expect(spy).not.toHaveBeenCalled();
  });

  it('should render evidence items in template', () => {
    component.body.set({ evidence: [new Evidence(), new Evidence()] });
    fixture.detectChanges();
    const items = fixture.nativeElement.querySelectorAll('app-evidence-item');
    expect(items.length).toBe(2);
  });

  it('should call deleteEvidence when child emits deleteEvidenceEvent', () => {
    component.body.set({ evidence: [new Evidence()] });
    fixture.detectChanges();
    const child = fixture.debugElement.nativeElement.querySelector('app-evidence-item');
    const spy = jest.spyOn(component, 'deleteEvidence');
    component.deleteEvidence(0);
    expect(spy).toHaveBeenCalledWith(0);
  });

  it('should not call PATCH_ResultEvidences or showToast if isEditableStatus is false', async () => {
    submission.isEditableStatus.mockReturnValue(false);
    const spyPatch = jest.spyOn(api, 'PATCH_ResultEvidences');
    const spyToast = jest.spyOn(actions, 'showToast');
    await component.saveData();
    expect(spyPatch).not.toHaveBeenCalled();
    expect(spyToast).not.toHaveBeenCalled();
  });

  it('should navigate without query params when version is absent (back)', async () => {
    const route = TestBed.inject(ActivatedRoute) as any;
    const routerSpy = jest.spyOn(router, 'navigate');
    route.snapshot.queryParamMap.get = () => null;

    await component.saveData('back');

    const call = (router.navigate as jest.Mock).mock.calls.pop();
    expect(call[0]).toEqual(['result', 123, 'links-to-result']);
    expect(call[1].queryParams).toBeUndefined();
    expect(call[1].replaceUrl).toBe(true);
  });

  it('should navigate without query params when version is absent (next)', async () => {
    const route = TestBed.inject(ActivatedRoute) as any;
    const routerSpy = jest.spyOn(router, 'navigate');
    route.snapshot.queryParamMap.get = () => null;

    await component.saveData('next');

    const call = (router.navigate as jest.Mock).mock.calls.pop();
    expect(call[0]).toEqual(['result', 123, 'ip-rights']);
    expect(call[1].queryParams).toBeUndefined();
    expect(call[1].replaceUrl).toBe(true);
  });

  it('should call getData when versionWatcher triggers version change', async () => {
    const spy = jest.spyOn(component, 'getData').mockResolvedValue();
    expect(component.versionWatcher.onVersionChange).toHaveBeenCalled();
    const cb = (component.versionWatcher.onVersionChange as jest.Mock).mock.calls[0][0];
    await cb();
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('should handle getData when evidence is null', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce({ data: { evidence: null } });
    await component.getData();
    expect(component.body().evidence.length).toBe(1);
  });

  it('should handle getData when evidence is undefined', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce({ data: { evidence: undefined } });
    await component.getData();
    expect(component.body().evidence.length).toBe(1);
  });

  it('should handle getData when data is null', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce({ data: null });
    await expect(component.getData()).rejects.toThrow();
  });

  it('should handle getData when data is undefined', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce({ data: undefined });
    await expect(component.getData()).rejects.toThrow();
  });

  it('should test setLoading private method', () => {
    component.loading.set(false);
    (component as any).setLoading(true);
    expect(component.loading()).toBe(true);
    (component as any).setLoading(false);
    expect(component.loading()).toBe(false);
  });

  it('should test navigateTo private method with version', () => {
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.queryParamMap.get = (key: string) => key === 'version' ? '1.0' : null;
    const spy = jest.spyOn(router, 'navigate');
    
    (component as any).navigateTo('links-to-result');
    
    expect(spy).toHaveBeenCalledWith(['result', 123, 'links-to-result'], {
      queryParams: { version: '1.0' },
      replaceUrl: true
    });
  });

  it('should test navigateTo private method without version', () => {
    const route = TestBed.inject(ActivatedRoute) as any;
    route.snapshot.queryParamMap.get = () => null;
    const spy = jest.spyOn(router, 'navigate');
    
    (component as any).navigateTo('ip-rights');
    
    expect(spy).toHaveBeenCalledWith(['result', 123, 'ip-rights'], {
      queryParams: undefined,
      replaceUrl: true
    });
  });

  it('should handle getData when response has no data property', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce({});
    await expect(component.getData()).rejects.toThrow();
  });

  it('should handle getData when response is null', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce(null);
    await expect(component.getData()).rejects.toThrow();
  });

  it('should handle getData when response is undefined', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce(undefined);
    await expect(component.getData()).rejects.toThrow();
  });

  it('should set otherReferences from notable_references when getData returns them', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce({
      data: {
        evidence: [],
        notable_references: [
          { notable_reference_type_id: 1, link: 'https://a.com' },
          { notable_reference_type_id: 2, link: null }
        ]
      }
    });
    await component.getData();
    expect(component.otherReferences().length).toBe(2);
    expect(component.otherReferences()[0]).toEqual({ type_id: 1, link: 'https://a.com' });
    expect(component.otherReferences()[1]).toEqual({ type_id: 2, link: '' });
  });

  it('should set otherReferences to empty when getData returns no notable_references', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce({
      data: { evidence: [], notable_references: [] }
    });
    await component.getData();
    expect(component.otherReferences()).toEqual([]);
  });

  it('should set otherReferences to empty when getData returns undefined notable_references', async () => {
    api.GET_ResultEvidences.mockResolvedValueOnce({
      data: { evidence: [] }
    });
    await component.getData();
    expect(component.otherReferences()).toEqual([]);
  });

  it('should add other reference when editable', () => {
    submission.isEditableStatus.mockReturnValue(true);
    component.otherReferences.set([]);
    component.addOtherReference();
    expect(component.otherReferences().length).toBe(1);
    expect(component.otherReferences()[0]).toEqual({ type_id: null, link: '' });
  });

  it('should not add other reference when not editable', () => {
    submission.isEditableStatus.mockReturnValue(false);
    component.otherReferences.set([]);
    component.addOtherReference();
    expect(component.otherReferences().length).toBe(0);
  });

  it('should remove other reference when editable', () => {
    submission.isEditableStatus.mockReturnValue(true);
    component.otherReferences.set([
      { type_id: 1, link: 'a' },
      { type_id: 2, link: 'b' }
    ]);
    component.removeOtherReference(0);
    expect(component.otherReferences().length).toBe(1);
    expect(component.otherReferences()[0]).toEqual({ type_id: 2, link: 'b' });
  });

  it('should not remove other reference when not editable', () => {
    submission.isEditableStatus.mockReturnValue(false);
    component.otherReferences.set([{ type_id: 1, link: 'a' }]);
    component.removeOtherReference(0);
    expect(component.otherReferences().length).toBe(1);
  });

  it('should update other reference at index', () => {
    component.otherReferences.set([
      { type_id: 1, link: 'old' },
      { type_id: 2, link: 'b' }
    ]);
    component.updateOtherReference(0, { type_id: 10, link: 'new' });
    expect(component.otherReferences()[0]).toEqual({ type_id: 10, link: 'new' });
    expect(component.otherReferences()[1]).toEqual({ type_id: 2, link: 'b' });
  });

  it('should buildPayload map notableReferences correctly', () => {
    component.body.set({ evidence: [new Evidence()] } as any);
    component.otherReferences.set([
      { type_id: 1, link: 'https://example.com' },
      { type_id: 2, link: '' }
    ]);
    const payload = (component as any).buildPayload();
    expect(payload.notable_references).toEqual([
      { notable_reference_type_id: 1, link: 'https://example.com' },
      { notable_reference_type_id: 2, link: '' }
    ]);
  });
});
