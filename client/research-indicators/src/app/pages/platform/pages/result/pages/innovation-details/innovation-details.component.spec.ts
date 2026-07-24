import { ComponentFixture, TestBed, fakeAsync, tick, waitForAsync } from '@angular/core/testing';
import { of } from 'rxjs';
import { Router, ActivatedRoute } from '@angular/router';
import { ApiService } from '../../../../../../shared/services/api.service';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { ActionsService } from '../../../../../../shared/services/actions.service';
import { SubmissionService } from '@shared/services/submission.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { GetInnovationReadinessLevelsService } from '@shared/services/control-list/get-innovation-readiness-levels.service';
import InnovationDetailsComponent from './innovation-details.component';
import {
  Actor,
  InstitutionType,
  KnowledgeSharingForm
} from '@shared/interfaces/get-innovation-details.interface';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { GetInnovationCharacteristicsService } from '@shared/services/control-list/get-innovation-characteristics.service';
import { GetInnovationTypesService } from '@shared/services/control-list/get-innovation-types.service';
import { GetAnticipatedUsersService } from '@shared/services/short-control-list/get-anticipated-users.service';
import { GetActorTypesService } from '@shared/services/control-list/get-actor-types.service';
import { GetInstitutionTypesService } from '@shared/services/control-list/get-institution-types.service';
import { UtilsService } from '@shared/services/utils.service';

// Mocks
class ApiServiceMock {
  GET_InnovationDetails = jest.fn().mockReturnValue(
    Promise.resolve({
      data: {
        short_title: 'Test',
        innovation_nature_id: 1,
        innovation_type_id: 2,
        innovation_readiness_id: 3,
        anticipated_users_id: 2,
        expected_outcome: 'Outcome',
        intended_beneficiaries_description: 'Desc',
        actors: [new Actor()],
        institution_types: [new InstitutionType()]
      }
    })
  );
  PATCH_InnovationDetails = jest.fn().mockReturnValue(Promise.resolve({ successfulRequest: true }));
}
class CacheServiceMock {
  currentResultId = jest.fn().mockReturnValue(1);
  getCurrentNumericResultId = jest.fn().mockReturnValue(1);
  currentResultIndicatorSectionPath = jest.fn().mockReturnValue('next-section');
  currentMetadata = jest.fn().mockReturnValue({});
  currentResultIsLoading = jest.fn().mockReturnValue(false);
  showSectionHeaderActions = jest.fn().mockReturnValue(false);
  hasSmallScreen = jest.fn().mockReturnValue(false);
  isSidebarCollapsed = jest.fn().mockReturnValue(false);
}
class ActionsServiceMock {
  saveCurrentSection = jest.fn();
  showToast = jest.fn();
}
class SubmissionServiceMock {
  isEditableStatus = jest.fn().mockReturnValue(true);
}
class VersionWatcherServiceMock {
  onVersionChange = jest.fn();
}
class GetInnovationReadinessLevelsServiceMock {
  list = jest.fn().mockReturnValue([
    { id: 3, level: 1, name: 'Level 1', definition: 'Def 1' },
    { id: 4, level: 2, name: 'Level 2', definition: 'Def 2' }
  ]);
}

class GetInnovationCharacteristicsServiceMock {
  list = jest.fn().mockReturnValue([]);
  loading = jest.fn().mockReturnValue(false);
  isOpenSearch = jest.fn().mockReturnValue(false);
  currentResultIsLoading = jest.fn().mockReturnValue(false);
}
class GetInnovationTypesServiceMock {
  list = jest.fn().mockReturnValue([]);
  loading = jest.fn().mockReturnValue(false);
  isOpenSearch = jest.fn().mockReturnValue(false);
  currentResultIsLoading = jest.fn().mockReturnValue(false);
}
class GetAnticipatedUsersServiceMock {
  list = jest.fn().mockReturnValue([
    { name: 'This is yet to be determined', value: 1 },
    { name: 'User have been determined', value: 2 }
  ]);
  loading = jest.fn().mockReturnValue(false);
  currentResultIsLoading = jest.fn().mockReturnValue(false);
}
class GetActorTypesServiceMock {
  list = jest.fn().mockReturnValue([]);
  loading = jest.fn().mockReturnValue(false);
  isOpenSearch = jest.fn().mockReturnValue(false);
  currentResultIsLoading = jest.fn().mockReturnValue(false);
}
class GetInstitutionTypesServiceMock {
  list = jest.fn().mockReturnValue([]);
  loading = jest.fn().mockReturnValue(false);
  isOpenSearch = jest.fn().mockReturnValue(false);
  currentResultIsLoading = jest.fn().mockReturnValue(false);
}
class UtilsServiceMock {
  getNestedProperty = jest.fn();
  setNestedPropertyWithReduceSignal = jest.fn();
  setNestedPropertyWithReduce = jest.fn();
  getNestedPropertySignal = jest.fn();
}

class ServiceLocatorServiceMock {
  getService(serviceName: string) {
    switch (serviceName) {
      case 'innovationCharacteristics':
        return new GetInnovationCharacteristicsServiceMock();
      case 'innovationTypes':
        return new GetInnovationTypesServiceMock();
      case 'anticipatedUsers':
        return new GetAnticipatedUsersServiceMock();
      case 'actorTypes':
        return new GetActorTypesServiceMock();
      case 'institutionTypes':
        return new GetInstitutionTypesServiceMock();
      default:
        return { list: jest.fn().mockReturnValue([]), loading: { set: jest.fn() }, isOpenSearch: jest.fn().mockReturnValue(false) };
    }
  }
}

const routerSpy = { navigate: jest.fn() };
const activatedRouteMock = {
  snapshot: {
    paramMap: { get: (key: string) => (key === 'id' ? '1' : null) },
    queryParamMap: {
      get: (key: string) => (key === 'version' ? 'v1' : null)
    }
  }
};

describe('InnovationDetailsComponent', () => {
  let component: InnovationDetailsComponent;
  let fixture: ComponentFixture<InnovationDetailsComponent>;
  let apiService: ApiServiceMock;
  let cache: CacheServiceMock;
  let actions: ActionsServiceMock;
  let submission: SubmissionServiceMock;
  let router: any;
  let getInnovationReadinessLevelsService: GetInnovationReadinessLevelsServiceMock;
  let serviceLocator: ServiceLocatorServiceMock;
  let versionWatcher: VersionWatcherServiceMock;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [InnovationDetailsComponent],
      providers: [
        { provide: ApiService, useClass: ApiServiceMock },
        { provide: CacheService, useClass: CacheServiceMock },
        { provide: ActionsService, useClass: ActionsServiceMock },
        { provide: SubmissionService, useClass: SubmissionServiceMock },
        { provide: VersionWatcherService, useClass: VersionWatcherServiceMock },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: activatedRouteMock },
        { provide: GetInnovationReadinessLevelsService, useClass: GetInnovationReadinessLevelsServiceMock },
        { provide: ServiceLocatorService, useClass: ServiceLocatorServiceMock },
        { provide: GetInnovationCharacteristicsService, useClass: GetInnovationCharacteristicsServiceMock },
        { provide: GetInnovationTypesService, useClass: GetInnovationTypesServiceMock },
        { provide: GetAnticipatedUsersService, useClass: GetAnticipatedUsersServiceMock },
        { provide: GetActorTypesService, useClass: GetActorTypesServiceMock },
        { provide: GetInstitutionTypesService, useClass: GetInstitutionTypesServiceMock },
        { provide: UtilsService, useClass: UtilsServiceMock }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(InnovationDetailsComponent);
    component = fixture.componentInstance;
    apiService = TestBed.inject(ApiService) as any;
    cache = TestBed.inject(CacheService) as any;
    actions = TestBed.inject(ActionsService) as any;
    submission = TestBed.inject(SubmissionService) as any;
    router = TestBed.inject(Router) as any;
    getInnovationReadinessLevelsService = TestBed.inject(GetInnovationReadinessLevelsService) as any;
    serviceLocator = TestBed.inject(ServiceLocatorService) as any;
    versionWatcher = TestBed.inject(VersionWatcherService) as any;
    fixture.detectChanges();
    TestBed.flushEffects();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getData when version watcher fires (cover onVersionChange callback)', fakeAsync(async () => {
    expect(versionWatcher.onVersionChange).toHaveBeenCalled();
    const callback = versionWatcher.onVersionChange.mock.calls[0][0];
    await callback();
    expect(apiService.GET_InnovationDetails).toHaveBeenCalled();
  }));

  it('should get data and set body', fakeAsync(async () => {
    await component.getData();
    TestBed.flushEffects();
    expect(apiService.GET_InnovationDetails).toHaveBeenCalled();
    expect(component.body().short_title).toBe('Test');
    expect(component.selectedStep()).toBe(1);
  }));

  it('syncSelectedStepFromReadiness should set selectedStep when level matches', () => {
    component.body.set({ ...component.body(), innovation_readiness_id: 4 });
    component.syncSelectedStepFromReadiness();
    expect(component.selectedStep()).toBe(2);
  });

  it('should map link_to_result other_result_id to result_id in getData', fakeAsync(async () => {
    const ksForm = new KnowledgeSharingForm();
    ksForm.link_to_result = [{ other_result_id: 42, link_result_id: 1 } as any];
    apiService.GET_InnovationDetails.mockReturnValue(
      Promise.resolve({
        data: {
          short_title: 'Test',
          innovation_readiness_id: 3,
          actors: [new Actor()],
          institution_types: [new InstitutionType()],
          knowledge_sharing_form: ksForm
        }
      })
    );
    await component.getData();
    expect(component.body().knowledge_sharing_form?.link_to_result?.[0].result_id).toBe(42);
  }));

  it('should leave link_to_result unchanged when no other_result_id', fakeAsync(async () => {
    const ksForm = new KnowledgeSharingForm();
    ksForm.link_to_result = [{ result_id: 10 } as any];
    apiService.GET_InnovationDetails.mockReturnValue(
      Promise.resolve({
        data: {
          short_title: 'Test',
          innovation_readiness_id: 3,
          actors: [new Actor()],
          institution_types: [new InstitutionType()],
          knowledge_sharing_form: ksForm
        }
      })
    );
    await component.getData();
    expect(component.body().knowledge_sharing_form?.link_to_result?.[0].result_id).toBe(10);
  }));

  it('should map tool_function_id in getData', fakeAsync(async () => {
    const ksForm = new KnowledgeSharingForm();
    (ksForm as any).tool_function_id = [{ tool_function_id: 10 }];
    apiService.GET_InnovationDetails.mockReturnValue(
      Promise.resolve({
        data: {
          short_title: 'Test',
          innovation_readiness_id: 3,
          actors: [new Actor()],
          institution_types: [new InstitutionType()],
          knowledge_sharing_form: ksForm
        }
      })
    );
    await component.getData();
    expect((component.body().knowledge_sharing_form as any).tool_function_id).toEqual([{ id: 10 }]);
  }));

  it('should set new_or_improved_varieties_count to 1 when true and count null in getData', fakeAsync(async () => {
    apiService.GET_InnovationDetails.mockReturnValue(
      Promise.resolve({
        data: {
          short_title: 'Test',
          innovation_readiness_id: 3,
          actors: [new Actor()],
          institution_types: [new InstitutionType()],
          is_new_or_improved_variety: true,
          new_or_improved_varieties_count: null
        }
      })
    );
    await component.getData();
    expect(component.body().new_or_improved_varieties_count).toBe(1);
  }));

  it('should add and delete actor', () => {
    component.body.set({ ...component.body(), actors: [] });
    component.addActor();
    expect(component.body().actors.length).toBe(1);
    component.deleteActor(0);
    expect(component.body().actors.length).toBe(0);
  });

  it('addActor should use empty array when actors is undefined (cover line 157 || branch)', () => {
    component.body.set({ ...component.body(), actors: undefined });
    component.addActor();
    expect(component.body().actors).toHaveLength(1);
  });

  it('addInstitutionType should use empty array when institution_types is undefined (cover line 174 || branch)', () => {
    component.body.set({ ...component.body(), institution_types: undefined });
    component.addInstitutionType();
    expect(component.body().institution_types).toHaveLength(1);
  });

  it('should add actor when body already has actors (cover line 158 actors branch)', () => {
    component.body.set({ ...component.body(), actors: [new Actor()] });
    component.addActor();
    expect(component.body().actors!.length).toBe(2);
  });

  it('should no-op deleteActor when actors is undefined (cover line 164 false branch)', () => {
    component.body.set({ ...component.body(), actors: undefined });
    component.deleteActor(0);
    expect(component.body().actors).toBeUndefined();
  });

  it('should add and delete institution type', () => {
    component.body.set({ ...component.body(), institution_types: [] });
    component.addInstitutionType();
    expect(component.body().institution_types.length).toBe(1);
    component.deleteInstitutionType(0);
    expect(component.body().institution_types.length).toBe(0);
  });

  it('should add institution type when body already has institution_types (cover line 174)', () => {
    component.body.set({ ...component.body(), institution_types: [new InstitutionType()] });
    component.addInstitutionType();
    expect(component.body().institution_types!.length).toBe(2);
  });

  it('should no-op deleteInstitutionType when institution_types is undefined (cover line 180 false branch)', () => {
    component.body.set({ ...component.body(), institution_types: undefined });
    component.deleteInstitutionType(0);
    expect(component.body().institution_types).toBeUndefined();
  });

  it('updateArray should not push when action is add but item is null (cover line 158 branch)', () => {
    const result = (component as any).updateArray([], null, 'add');
    expect(result).toEqual([]);
  });

  it('updateArray should not splice when action is remove but index is undefined (cover line 160 branch)', () => {
    const arr = [new Actor()];
    const result = (component as any).updateArray(arr, null, 'remove');
    expect(result).toHaveLength(1);
    expect(result).toEqual(arr);
  });

  it('deleteActor should no-op when actors is null (cover line 165 falsy branch)', () => {
    component.body.set({ ...component.body(), actors: null as any });
    component.deleteActor(0);
    expect(component.body().actors).toBeNull();
  });

  it('deleteInstitutionType should no-op when institution_types is null (cover line 174 falsy branch)', () => {
    component.body.set({ ...component.body(), institution_types: null as any });
    component.deleteInstitutionType(0);
    expect(component.body().institution_types).toBeNull();
  });

  it('should return stepNumbers and stepLevels', () => {
    expect(component.stepNumbers).toEqual([1, 2]);
    expect(component.stepLevels.length).toBe(2);
  });

  it('should get selectedLevel', () => {
    component.selectedStep.set(2);
    expect(component.selectedLevel).toEqual({ id: 4, level: 2, name: 'Level 2', definition: 'Def 2' });
  });

  it('should get step tooltip', () => {
    const tooltip = component.getStepTooltip(1);
    expect(tooltip).toContain('Level 1');
  });

  it('should select step and update body', () => {
    component.selectStep(2);
    expect(component.selectedStep()).toBe(2);
    expect(component.body().innovation_readiness_id).toBe(4);
  });

  it('should scroll to anticipated section on change', fakeAsync(() => {
    const scrollIntoViewMock = jest.fn();
    jest.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView: scrollIntoViewMock } as any);
    component.body.set({ ...component.body(), anticipated_users_id: 2 });
    component.onAnticipatedUsersChange();
    tick(100);
    expect(document.getElementById).toHaveBeenCalledWith('anticipated-section');
    expect(scrollIntoViewMock).toHaveBeenCalled();
  }));

  it('should save data and navigate next', fakeAsync(async () => {
    apiService.PATCH_InnovationDetails.mockReturnValue(Promise.resolve({ successfulRequest: true }));
    jest.spyOn(component, 'getData').mockReturnValue(Promise.resolve());
    await component.saveData('next');
    expect(apiService.PATCH_InnovationDetails).toHaveBeenCalled();
    expect(actions.showToast).toHaveBeenCalled();
    // Navigation happens when editable, so it should be called here
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'partners'], { queryParams: { version: 'v1' }, replaceUrl: true });
  }));

  it('should save data and navigate back', fakeAsync(async () => {
    apiService.PATCH_InnovationDetails.mockReturnValue(Promise.resolve({ successfulRequest: true }));
    jest.spyOn(component, 'getData').mockReturnValue(Promise.resolve());
    await component.saveData('back');
    // Navigation happens when editable, so it should be called here
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'alliance-alignment'], { queryParams: { version: 'v1' }, replaceUrl: true });
  }));

  it('should not PATCH if not editable', fakeAsync(async () => {
    submission.isEditableStatus.mockReturnValue(false);
    await component.saveData();
    expect(apiService.PATCH_InnovationDetails).not.toHaveBeenCalled();
  }));

  it('should navigate when not editable', fakeAsync(async () => {
    submission.isEditableStatus.mockReturnValue(false);
    await component.saveData('next');
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'partners'], { queryParams: { version: 'v1' }, replaceUrl: true });
  }));

  it('should navigate back when not editable', fakeAsync(async () => {
    submission.isEditableStatus.mockReturnValue(false);
    await component.saveData('back');
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'alliance-alignment'], { queryParams: { version: 'v1' }, replaceUrl: true });
  }));

  it('canRemove should return true if editable', () => {
    submission.isEditableStatus.mockReturnValue(true);
    expect(component.canRemove()).toBeTruthy();
    submission.isEditableStatus.mockReturnValue(false);
    expect(component.canRemove()).toBeFalsy();
  });

  it('should clean institution_types with custom name when saving', fakeAsync(async () => {
    component.body.set({
      ...component.body(),
      institution_types: [
        {
          is_organization_known: false,
          institution_type_id: null,
          result_institution_type_id: null,
          sub_institution_type_id: null,
          institution_id: null,
          institution_type_custom_name: 'Custom'
        } as any
      ]
    });
    apiService.PATCH_InnovationDetails.mockReturnValue(Promise.resolve({ successfulRequest: true }));
    jest.spyOn(component, 'getData').mockReturnValue(Promise.resolve());
    await component.saveData();
    expect(apiService.PATCH_InnovationDetails).toHaveBeenCalledWith(
      1,
      expect.objectContaining({
        institution_types: expect.arrayContaining([
          expect.objectContaining({
            is_organization_known: false,
            institution_type_custom_name: 'Custom'
          })
        ])
      })
    );
  }));

  it('should not show toast or call getData if PATCH is not successful', fakeAsync(async () => {
    apiService.PATCH_InnovationDetails.mockReturnValue(Promise.resolve({ successfulRequest: false }));
    jest.spyOn(component, 'getData').mockReturnValue(Promise.resolve());
    await component.saveData('next');
    expect(actions.showToast).not.toHaveBeenCalled();
    expect(component.getData).not.toHaveBeenCalled();
  }));

  it('should do nothing if anticipated_users_id is not 2', () => {
    component.body.set({ ...component.body(), anticipated_users_id: 1 });
    // No error should occur, nothing to assert
    component.onAnticipatedUsersChange();
  });

  it('should not throw if getElementById returns null', fakeAsync(() => {
    jest.spyOn(document, 'getElementById').mockReturnValue(null);
    component.body.set({ ...component.body(), anticipated_users_id: 2 });
    component.onAnticipatedUsersChange();
    tick(100);
    // No error should occur
  }));

  it('should set default value for new_or_improved_varieties_count when is_new_or_improved_variety is true and count is null', () => {
    component.body.set({
      ...component.body(),
      is_new_or_improved_variety: 1,
      new_or_improved_varieties_count: undefined
    });
    component.onNewOrImprovedVarietyChange();
    expect(component.body().new_or_improved_varieties_count).toBe(1);
  });

  it('should not set default value when is_new_or_improved_variety is false', () => {
    component.body.set({
      ...component.body(),
      is_new_or_improved_variety: 0,
      new_or_improved_varieties_count: undefined
    });
    component.onNewOrImprovedVarietyChange();
    expect(component.body().new_or_improved_varieties_count).toBe(undefined);
  });

  it('should not set default value when new_or_improved_varieties_count already has a value', () => {
    component.body.set({
      ...component.body(),
      is_new_or_improved_variety: 1,
      new_or_improved_varieties_count: 5
    });
    component.onNewOrImprovedVarietyChange();
    expect(component.body().new_or_improved_varieties_count).toBe(5);
  });

  it('should return empty string if getStepTooltip level does not exist', () => {
    expect(component.getStepTooltip(999)).toBe('');
  });

  it('should not update body if selectStep level does not exist', () => {
    const prev = component.body().innovation_readiness_id;
    component.selectStep(999);
    expect(component.body().innovation_readiness_id).toBe(prev);
  });

  it('should set default institution_types and actors if empty in getData', fakeAsync(async () => {
    apiService.GET_InnovationDetails.mockReturnValue(Promise.resolve({ data: { actors: [], institution_types: [] } }));
    await component.getData();
    expect(component.body().actors.length).toBe(1);
    expect(component.body().institution_types.length).toBe(1);
  }));

  it('should pass version as queryParam if present', fakeAsync(async () => {
    submission.isEditableStatus.mockReturnValue(false);
    jest.spyOn(component, 'getData').mockReturnValue(Promise.resolve());
    await component.saveData('next');
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'partners'], { queryParams: { version: 'v1' }, replaceUrl: true });
  }));

  it('saveData should clean institution_types is_organization_known and filter', fakeAsync(async () => {
    const instKnown = new InstitutionType();
    instKnown.is_organization_known = true;
    instKnown.institution_id = 5;
    const instUnknown = new InstitutionType();
    instUnknown.institution_type_id = 10;
    instUnknown.institution_type_custom_name = 'Custom';
    component.body.set({
      ...component.body(),
      institution_types: [instKnown, instUnknown]
    });
    apiService.PATCH_InnovationDetails.mockReturnValue(Promise.resolve({ successfulRequest: true }));
    jest.spyOn(component, 'getData').mockReturnValue(Promise.resolve());
    await component.saveData('next');
    const patchCall = apiService.PATCH_InnovationDetails.mock.calls[0][1];
    expect(patchCall.institution_types).toBeDefined();
    expect(patchCall.institution_types.some((i: any) => i.is_organization_known === true && i.institution_id === 5)).toBe(true);
    expect(patchCall.institution_types.some((i: any) => i.institution_type_custom_name === 'Custom')).toBe(true);
  }));

  it('saveData should transform link_to_result and tool_function_id', fakeAsync(async () => {
    const ksForm = new KnowledgeSharingForm();
    (ksForm as any).link_to_result = [
      { link_result_id: 1, result_id: 10, other_result_id: 11, link_result_role_id: 2 },
      { result_id: 20 }
    ];
    (ksForm as any).tool_function_id = [{ id: 5 }, { id: 6 }];
    component.body.set({
      ...component.body(),
      knowledge_sharing_form: ksForm
    });
    apiService.PATCH_InnovationDetails.mockReturnValue(Promise.resolve({ successfulRequest: true }));
    jest.spyOn(component, 'getData').mockReturnValue(Promise.resolve());
    await component.saveData('back');
    const patchCall = apiService.PATCH_InnovationDetails.mock.calls[0][1];
    expect(patchCall.knowledge_sharing_form.link_to_result).toBeDefined();
    expect(patchCall.knowledge_sharing_form.tool_function_id).toEqual([{ tool_function_id: 5 }, { tool_function_id: 6 }]);
  }));

  it('saveData should navigate without queryParams when version is missing', fakeAsync(async () => {
    const routeNoVersion = {
      snapshot: {
        paramMap: { get: (key: string) => (key === 'id' ? '1' : null) },
        queryParamMap: { get: () => null }
      }
    };
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      imports: [InnovationDetailsComponent],
      providers: [
        { provide: ApiService, useClass: ApiServiceMock },
        { provide: CacheService, useClass: CacheServiceMock },
        { provide: ActionsService, useClass: ActionsServiceMock },
        { provide: SubmissionService, useClass: SubmissionServiceMock },
        { provide: VersionWatcherService, useClass: VersionWatcherServiceMock },
        { provide: Router, useValue: routerSpy },
        { provide: ActivatedRoute, useValue: routeNoVersion },
        { provide: GetInnovationReadinessLevelsService, useClass: GetInnovationReadinessLevelsServiceMock },
        { provide: ServiceLocatorService, useClass: ServiceLocatorServiceMock },
        { provide: GetInnovationCharacteristicsService, useClass: GetInnovationCharacteristicsServiceMock },
        { provide: GetInnovationTypesService, useClass: GetInnovationTypesServiceMock },
        { provide: GetAnticipatedUsersService, useClass: GetAnticipatedUsersServiceMock },
        { provide: GetActorTypesService, useClass: GetActorTypesServiceMock },
        { provide: GetInstitutionTypesService, useClass: GetInstitutionTypesServiceMock },
        { provide: UtilsService, useClass: UtilsServiceMock }
      ]
    });
    const fixture2 = TestBed.createComponent(InnovationDetailsComponent);
    const comp = fixture2.componentInstance;
    submission.isEditableStatus.mockReturnValue(false);
    await comp.saveData('next');
    expect(router.navigate).toHaveBeenCalledWith(['result', 1, 'partners'], { queryParams: undefined, replaceUrl: true });
  }));
});
