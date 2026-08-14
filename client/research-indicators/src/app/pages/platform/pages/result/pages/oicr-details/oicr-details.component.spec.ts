import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Component, Input, NO_ERRORS_SCHEMA, Output, EventEmitter } from '@angular/core';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';
import { AccordionModule } from 'primeng/accordion';
import { NgTemplateOutlet } from '@angular/common';

import OicrDetailsComponent from './oicr-details.component';
import { CacheService } from '@shared/services/cache/cache.service';
import { ApiService } from '@shared/services/api.service';
import { SubmissionService } from '@shared/services/submission.service';
import { ActionsService } from '@shared/services/actions.service';
import { VersionWatcherService } from '@shared/services/version-watcher.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { RolesService } from '@shared/services/cache/roles.service';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { ContactPersonResponse } from '@shared/interfaces/contact-person.interface';

describe('OicrDetailsComponent', () => {
  let component: OicrDetailsComponent;
  let fixture: ComponentFixture<OicrDetailsComponent>;

  let cacheService: jest.Mocked<CacheService>;
  let apiService: jest.Mocked<ApiService>;
  let submissionService: jest.Mocked<SubmissionService>;
  let actionsService: jest.Mocked<ActionsService>;
  let versionWatcher: jest.Mocked<VersionWatcherService>;
  let allModalsService: jest.Mocked<AllModalsService>;
  let router: jest.Mocked<Router>;

  beforeEach(async () => {
    const mockCacheService: jest.Mocked<CacheService> = {
      getCurrentNumericResultId: jest.fn().mockReturnValue(1),
      currentResultId: jest.fn().mockReturnValue('1'),
      isExternalResult: jest.fn().mockReturnValue(false)
      // @ts-expect-error partial mock
    } as jest.Mocked<CacheService>;

    const mockApiService: jest.Mocked<ApiService> = {
      GET_AutorContact: jest.fn(),
      DELETE_AutorContact: jest.fn(),
      POST_AutorContact: jest.fn(),
      GET_Oicr: jest.fn(),
      PATCH_Oicr: jest.fn()
      // @ts-expect-error partial mock
    } as jest.Mocked<ApiService>;

    const mockSubmissionService: jest.Mocked<SubmissionService> = {
      isEditableStatus: jest.fn().mockReturnValue(true)
      // @ts-expect-error partial mock
    } as jest.Mocked<SubmissionService>;

    const mockActionsService: jest.Mocked<ActionsService> = {
      showToast: jest.fn()
      // @ts-expect-error partial mock
    } as jest.Mocked<ActionsService>;

    const mockVersionWatcher: jest.Mocked<VersionWatcherService> = {
      onVersionChange: jest.fn()
      // @ts-expect-error partial mock
    } as jest.Mocked<VersionWatcherService>;

    const mockAllModalsService: jest.Mocked<AllModalsService> = {
      toggleModal: jest.fn(),
      setAddContactPersonConfirm: jest.fn(),
      setDisabledAddContactPerson: jest.fn()
      // @ts-expect-error partial mock
    } as jest.Mocked<AllModalsService>;

    const mockRolesService: jest.Mocked<RolesService> = {
      isAdmin: jest.fn().mockReturnValue(true)
      // @ts-expect-error partial mock
    } as jest.Mocked<RolesService>;

    const mockRouter: jest.Mocked<Router> = {
      navigate: jest.fn()
      // @ts-expect-error partial mock
    } as jest.Mocked<Router>;

    const mockActivatedRoute: Partial<ActivatedRoute> = {
      snapshot: {
        // @ts-expect-error minimal queryParamMap mock
        queryParamMap: { get: jest.fn().mockReturnValue(null) }
      } as any
    };

    const mockServiceLocator: jest.Mocked<ServiceLocatorService> = {
      getService: jest.fn()
      // @ts-expect-error partial mock
    } as jest.Mocked<ServiceLocatorService>;

    // No necesitamos el template y así evitamos cargar todos los hijos
    TestBed.overrideComponent(OicrDetailsComponent, { set: { template: '' } });

    await TestBed.configureTestingModule({
      imports: [OicrDetailsComponent],
      providers: [
        { provide: CacheService, useValue: mockCacheService },
        { provide: ApiService, useValue: mockApiService },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: VersionWatcherService, useValue: mockVersionWatcher },
        { provide: AllModalsService, useValue: mockAllModalsService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ServiceLocatorService, useValue: mockServiceLocator }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OicrDetailsComponent);
    component = fixture.componentInstance;

    cacheService = TestBed.inject(CacheService) as jest.Mocked<CacheService>;
    apiService = TestBed.inject(ApiService) as jest.Mocked<ApiService>;
    submissionService = TestBed.inject(SubmissionService) as jest.Mocked<SubmissionService>;
    actionsService = TestBed.inject(ActionsService) as jest.Mocked<ActionsService>;
    versionWatcher = TestBed.inject(VersionWatcherService) as jest.Mocked<VersionWatcherService>;
    allModalsService = TestBed.inject(AllModalsService) as jest.Mocked<AllModalsService>;
    router = TestBed.inject(Router) as jest.Mocked<Router>;
  });

  it('should create and setup modal + version watcher', () => {
    expect(component).toBeTruthy();
    expect(allModalsService.setAddContactPersonConfirm).toHaveBeenCalled();
    expect(allModalsService.setDisabledAddContactPerson).toHaveBeenCalled();
    expect(versionWatcher.onVersionChange).toHaveBeenCalled();
  });

  it('version change callback should call getData', () => {
    const getDataSpy = jest.spyOn(component, 'getData').mockResolvedValue();
    const callback = (versionWatcher.onVersionChange as jest.Mock).mock.calls[0][0];
    callback();
    expect(getDataSpy).toHaveBeenCalled();
  });

  it('should pass isAddContactPersonDisabled to setDisabledAddContactPerson', () => {
    const setDisabled = allModalsService.setDisabledAddContactPerson as jest.Mock;
    const disabledCallback = setDisabled.mock.calls[0][0];
    submissionService.isEditableStatus.mockReturnValue(true);
    expect(disabledCallback()).toBe(false);
    submissionService.isEditableStatus.mockReturnValue(false);
    expect(disabledCallback()).toBe(true);
  });

  describe('quantifications handlers', () => {
    it('should add and remove quantification when editable', () => {
      submissionService.isEditableStatus.mockReturnValue(true);
      expect(component.quantifications().length).toBe(0);

      component.addQuantification();
      expect(component.quantifications().length).toBe(1);

      component.removeQuantification(0);
      expect(component.quantifications().length).toBe(0);
    });

    it('should not modify quantifications when not editable', () => {
      submissionService.isEditableStatus.mockReturnValue(false);
      const initialLength = component.quantifications().length;
      component.addQuantification();
      component.removeQuantification(0);
      expect(component.quantifications().length).toBe(initialLength);
    });

    it('should update quantification at index', () => {
      component.quantifications.set([{ number: null, unit: '', comments: '' }]);
      const data = { number: 10, unit: 'kg', comments: 'test' };
      component.updateQuantification(0, data);
      expect(component.quantifications()[0]).toEqual(data);
    });

    it('should update only item at index when multiple quantifications (cover map branches)', () => {
      component.quantifications.set([
        { number: 1, unit: 'a', comments: 'c1' },
        { number: 2, unit: 'b', comments: 'c2' }
      ]);
      const data = { number: 99, unit: 'kg', comments: 'updated' };
      component.updateQuantification(1, data);
      expect(component.quantifications()[0]).toEqual({ number: 1, unit: 'a', comments: 'c1' });
      expect(component.quantifications()[1]).toEqual(data);
    });
  });

  describe('extrapolated estimates handlers', () => {
    it('should add and remove extrapolated estimate when editable', () => {
      submissionService.isEditableStatus.mockReturnValue(true);
      expect(component.extrapolatedEstimates().length).toBe(0);

      component.addExtrapolatedEstimate();
      expect(component.extrapolatedEstimates().length).toBe(1);

      component.removeExtrapolatedEstimate(0);
      expect(component.extrapolatedEstimates().length).toBe(0);
    });

    it('should not modify extrapolated estimates when not editable', () => {
      submissionService.isEditableStatus.mockReturnValue(false);
      const initialLength = component.extrapolatedEstimates().length;
      component.addExtrapolatedEstimate();
      component.removeExtrapolatedEstimate(0);
      expect(component.extrapolatedEstimates().length).toBe(initialLength);
    });

    it('should update extrapolated estimate at index', () => {
      component.extrapolatedEstimates.set([{ number: null, unit: '', comments: '' }]);
      const data = { number: 5, unit: 'ha', comments: 'extrapolated' };
      component.updateExtrapolatedEstimate(0, data);
      expect(component.extrapolatedEstimates()[0]).toEqual(data);
    });

    it('should update only item at index when multiple extrapolated estimates (cover map branches)', () => {
      component.extrapolatedEstimates.set([
        { number: 1, unit: 'x', comments: 'e1' },
        { number: 2, unit: 'y', comments: 'e2' }
      ]);
      const data = { number: 50, unit: 'ha', comments: 'updated' };
      component.updateExtrapolatedEstimate(1, data);
      expect(component.extrapolatedEstimates()[0]).toEqual({ number: 1, unit: 'x', comments: 'e1' });
      expect(component.extrapolatedEstimates()[1]).toEqual(data);
    });
  });

  describe('contact persons', () => {
    it('should open add contact person modal', () => {
      component.onAddContactPerson();
      expect(allModalsService.toggleModal).toHaveBeenCalledWith('addContactPerson');
    });

    it('should no-op for an external result (defense-in-depth method guard, T-15)', () => {
      cacheService.isExternalResult.mockReturnValue(true);

      component.onAddContactPerson();

      expect(allModalsService.toggleModal).not.toHaveBeenCalled();
    });

    it('should load and map contact persons from array response', async () => {
      const responseData: ContactPersonResponse[] = [
        {
          result_user_id: 1,
          user_id: 10,
          informative_role_id: 20,
          user: {
            first_name: 'John',
            last_name: 'Doe',
            position: 'Researcher',
            affiliation: 'Center A',
            email: 'john@example.com',
            center: 'Center A'
          } as any,
          informativeRole: { name: 'Lead' } as any
        } as any
      ];

      apiService.GET_AutorContact.mockResolvedValue({ data: responseData } as any);

      await component.loadContactPersons();

      const rows = component.contactPersons();
      expect(apiService.GET_AutorContact).toHaveBeenCalledWith(cacheService.getCurrentNumericResultId());
      expect(rows.length).toBe(1);
      expect(rows[0]).toMatchObject({
        id: 1,
        name: 'John Doe',
        position: 'Researcher',
        affiliation: 'Center A',
        email: 'john@example.com',
        role: 'Lead',
        user_id: 10,
        informative_role_id: 20
      });
    });

    it('should handle non-array contact persons response', async () => {
      const oneItem: ContactPersonResponse = {
        result_user_id: 2,
        user_id: 11,
        informative_role_id: 21,
        user: {
          first_name: 'Jane',
          last_name: 'Smith',
          position: undefined,
          affiliation: undefined,
          email: undefined,
          center: 'Center B'
        } as any,
        informativeRole: undefined as any
      } as any;

      apiService.GET_AutorContact.mockResolvedValue({ data: oneItem } as any);

      await component.loadContactPersons();

      const rows = component.contactPersons();
      expect(rows[0]).toMatchObject({
        id: 2,
        name: 'Jane Smith',
        position: '-',
        affiliation: 'Center B',
        email: '-',
        role: '-'
      });
    });

    it('should map contact person with all fallbacks when user fields missing', async () => {
      const oneItem: ContactPersonResponse = {
        result_user_id: 3,
        user_id: 12,
        informative_role_id: 22,
        user: {
          first_name: '',
          last_name: '',
          position: undefined,
          affiliation: undefined,
          email: undefined,
          center: undefined
        } as any,
        informativeRole: undefined as any
      } as any;

      apiService.GET_AutorContact.mockResolvedValue({ data: oneItem } as any);

      await component.loadContactPersons();

      const rows = component.contactPersons();
      expect(rows[0]).toMatchObject({
        id: 3,
        name: '',
        position: '-',
        affiliation: '-',
        email: '-',
        role: '-',
        user_id: 12,
        informative_role_id: 22
      });
    });

    it('should clear contact persons when response has no data', async () => {
      apiService.GET_AutorContact.mockResolvedValue({ data: null } as any);
      await component.loadContactPersons();
      expect(component.contactPersons()).toEqual([]);
    });

    it('should clear contact persons when response is undefined (no res.data)', async () => {
      apiService.GET_AutorContact.mockResolvedValue({} as any);
      await component.loadContactPersons();
      expect(component.contactPersons()).toEqual([]);
    });

    it('should delete contact person and reload list on success', async () => {
      const row = { id: 5 } as any;
      apiService.DELETE_AutorContact.mockResolvedValue({ successfulRequest: true } as any);
      const loadSpy = jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.onDeleteContactPerson(row);

      expect(apiService.DELETE_AutorContact).toHaveBeenCalledWith(5, cacheService.getCurrentNumericResultId());
      expect(loadSpy).toHaveBeenCalled();
      expect(actionsService.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Contact person',
        detail: 'Deleted successfully'
      });
    });

    it('should not delete contact person if row has no id', async () => {
      await component.onDeleteContactPerson({} as any);
      expect(apiService.DELETE_AutorContact).not.toHaveBeenCalled();
    });

    it('should not delete contact person when the result is external (T-07 R-RC-003 AC.2)', async () => {
      const row = { id: 5 } as any;
      cacheService.isExternalResult.mockReturnValue(true);

      await component.onDeleteContactPerson(row);

      expect(apiService.DELETE_AutorContact).not.toHaveBeenCalled();
      expect(actionsService.showToast).not.toHaveBeenCalled();
    });

    it('should still delete contact person for a STAR result in an editable status (regression, R-RC-003 AC.3)', async () => {
      const row = { id: 5 } as any;
      cacheService.isExternalResult.mockReturnValue(false);
      apiService.DELETE_AutorContact.mockResolvedValue({ successfulRequest: true } as any);
      const loadSpy = jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.onDeleteContactPerson(row);

      expect(apiService.DELETE_AutorContact).toHaveBeenCalledWith(5, cacheService.getCurrentNumericResultId());
      expect(loadSpy).toHaveBeenCalled();
    });

    it('should not reload or show toast when DELETE_AutorContact returns unsuccessful', async () => {
      const row = { id: 5 } as any;
      apiService.DELETE_AutorContact.mockResolvedValue({ successfulRequest: false } as any);
      const loadSpy = jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.onDeleteContactPerson(row);

      expect(apiService.DELETE_AutorContact).toHaveBeenCalledWith(5, cacheService.getCurrentNumericResultId());
      expect(loadSpy).not.toHaveBeenCalled();
      expect(actionsService.showToast).not.toHaveBeenCalledWith(
        expect.objectContaining({ severity: 'success', detail: 'Deleted successfully' })
      );
    });
  });

  describe('modal actions and validation', () => {
    it('should disable add contact person when not editable', () => {
      submissionService.isEditableStatus.mockReturnValue(false);
      expect(component.isAddContactPersonDisabled()).toBe(true);
    });

    it('should handle invalid data on confirm add contact person', async () => {
      await component.onConfirmAddContactPerson({ contact_person_id: undefined, role_id: undefined } as any);
      expect(actionsService.showToast).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Please select both contact person and role'
      });
      expect(apiService.POST_AutorContact).not.toHaveBeenCalled();
    });

    it('should invoke setAddContactPersonConfirm callback (cover line 137)', async () => {
      apiService.POST_AutorContact.mockResolvedValue({} as any);
      jest.spyOn(component, 'loadContactPersons').mockResolvedValue();
      const confirmCallback = (allModalsService.setAddContactPersonConfirm as jest.Mock).mock.calls[0][0];
      await confirmCallback({ contact_person_id: 5, role_id: 10 });
      expect(apiService.POST_AutorContact).toHaveBeenCalledWith(
        { user_id: 5, informative_role_id: 10 },
        cacheService.getCurrentNumericResultId()
      );
    });

    it('should add contact person and close modal on success', async () => {
      const data = { contact_person_id: 99, role_id: 7 } as any;
      apiService.POST_AutorContact.mockResolvedValue({} as any);
      const loadSpy = jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.onConfirmAddContactPerson(data);

      expect(apiService.POST_AutorContact).toHaveBeenCalledWith(
        { user_id: 99, informative_role_id: 7 },
        cacheService.getCurrentNumericResultId()
      );
      expect(loadSpy).toHaveBeenCalled();
      expect(actionsService.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Contact person',
        detail: 'Added successfully'
      });
      expect(allModalsService.toggleModal).toHaveBeenCalledWith('addContactPerson');
    });

    it('should show error toast when add contact person fails', async () => {
      const data = { contact_person_id: 99, role_id: 7 } as any;
      apiService.POST_AutorContact.mockRejectedValue(new Error('fail'));

      await component.onConfirmAddContactPerson(data);

      expect(actionsService.showToast).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to add contact person'
      });
    });
  });

  describe('getData', () => {
    it('should map body, quantifications, extrapolated estimates and impact areas', async () => {
      const response = {
        data: {
          oicr_internal_code: 'OC-1',
          actual_count: [
            { quantification_number: '10', unit: 'kg', description: 'desc1' },
            { quantification_number: 5, unit: 'ha', description: 'desc2' }
          ],
          extrapolate_estimates: [{ quantification_number: '3', unit: 'kg', description: 'ext1' }],
          result_impact_areas: [
            { impact_area_id: 1, impact_area_score_id: 2, global_target_id: 3 },
            { impact_area_id: 4, impact_area_score_id: undefined, global_target_id: undefined }
          ]
        }
      } as any;

      apiService.GET_Oicr.mockResolvedValue(response);
      const loadContactsSpy = jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.getData();

      expect(apiService.GET_Oicr).toHaveBeenCalledWith(cacheService.getCurrentNumericResultId());
      expect(loadContactsSpy).toHaveBeenCalled();

      expect(component.body().oicr_internal_code).toBe('OC-1');
      expect(component.quantifications().length).toBe(2);
      expect(component.quantifications()[0]).toEqual({ number: 10, unit: 'kg', comments: 'desc1' });
      expect(component.quantifications()[1]).toEqual({ number: 5, unit: 'ha', comments: 'desc2' });

      expect(component.extrapolatedEstimates().length).toBe(1);
      expect(component.extrapolatedEstimates()[0]).toEqual({ number: 3, unit: 'kg', comments: 'ext1' });

      expect(component.body().result_impact_areas?.length).toBe(2);
      expect(component.loading()).toBe(false);
    });

    it('should fallback to default quantification and extrapolated estimates when arrays are empty', async () => {
      apiService.GET_Oicr.mockResolvedValue({ data: {} } as any);
      const loadContactsSpy = jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.getData();

      expect(loadContactsSpy).toHaveBeenCalled();
      expect(component.quantifications()).toEqual([]);
      expect(component.extrapolatedEstimates()).toEqual([]);
    });

    it('should use empty object when response.data is falsy', async () => {
      apiService.GET_Oicr.mockResolvedValue({} as any);
      const loadContactsSpy = jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.getData();

      expect(component.body()).toEqual({});
      expect(loadContactsSpy).toHaveBeenCalled();
    });

    it('should parse quantification number as string and handle NaN', async () => {
      apiService.GET_Oicr.mockResolvedValue({
        data: {
          actual_count: [
            { quantification_number: '42', unit: 'kg', description: 'd1' },
            { quantification_number: 'invalid', unit: 'ha', description: 'd2' }
          ],
          extrapolate_estimates: [
            { quantification_number: 10, unit: 'm', description: 'e1' },
            { quantification_number: null, unit: '', description: '' }
          ]
        }
      } as any);
      jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.getData();

      expect(component.quantifications()[0]).toEqual({ number: 42, unit: 'kg', comments: 'd1' });
      expect(component.quantifications()[1]).toEqual({ number: null, unit: 'ha', comments: 'd2' });
      expect(component.extrapolatedEstimates()[0]).toEqual({ number: 10, unit: 'm', comments: 'e1' });
      expect(component.extrapolatedEstimates()[1]).toEqual({ number: null, unit: '', comments: '' });
    });

    it('should parse quantification when raw is number and when undefined (cover all parse branches)', async () => {
      apiService.GET_Oicr.mockResolvedValue({
        data: {
          actual_count: [
            { quantification_number: 100, unit: 'kg', description: 'num' },
            { quantification_number: undefined, unit: undefined, description: undefined }
          ],
          extrapolate_estimates: [
            { quantification_number: '200', unit: 'm', description: 'ext' },
            { quantification_number: undefined, unit: undefined, description: undefined }
          ]
        }
      } as any);
      jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.getData();

      expect(component.quantifications()[0]).toEqual({ number: 100, unit: 'kg', comments: 'num' });
      expect(component.quantifications()[1]).toEqual({ number: null, unit: '', comments: '' });
      expect(component.extrapolatedEstimates()[0]).toEqual({ number: 200, unit: 'm', comments: 'ext' });
      expect(component.extrapolatedEstimates()[1]).toEqual({ number: null, unit: '', comments: '' });
    });

    it('should parse extrapolate_estimates string to number and NaN (cover line 207 branches)', async () => {
      apiService.GET_Oicr.mockResolvedValue({
        data: {
          actual_count: [],
          extrapolate_estimates: [
            { quantification_number: '99', unit: 'u1', description: 'd1' },
            { quantification_number: 'not-a-number', unit: 'u2', description: 'd2' }
          ]
        }
      } as any);
      jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.getData();

      expect(component.extrapolatedEstimates().length).toBe(2);
      expect(component.extrapolatedEstimates()[0]).toEqual({ number: 99, unit: 'u1', comments: 'd1' });
      expect(component.extrapolatedEstimates()[1]).toEqual({ number: null, unit: 'u2', comments: 'd2' });
    });

    it('should map result_impact_areas when present', async () => {
      apiService.GET_Oicr.mockResolvedValue({
        data: {
          result_impact_areas: [
            { impact_area_id: 1, impact_area_score_id: 2, global_target_id: 3 },
            { impact_area_id: 4, impact_area_score_id: undefined, global_target_id: undefined }
          ]
        }
      } as any);
      jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.getData();

      expect(component.body().result_impact_areas).toHaveLength(2);
      expect(component.body().result_impact_areas![0]).toEqual({
        impact_area_id: 1,
        impact_area_score_id: 2,
        result_impact_area_global_targets: [{ global_target_id: 3 }]
      });
      expect(component.body().result_impact_areas![1]).toEqual({
        impact_area_id: 4,
        impact_area_score_id: undefined,
        result_impact_area_global_targets: undefined
      });
    });

    it('should map result_impact_area_global_targets when API returns nested array', async () => {
      apiService.GET_Oicr.mockResolvedValue({
        data: {
          result_impact_areas: [
            {
              impact_area_id: 1,
              impact_area_score_id: 2,
              result_impact_area_global_targets: [{ global_target_id: 9 }, { global_target_id: 10 }]
            }
          ]
        }
      } as any);
      jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.getData();

      expect(component.body().result_impact_areas![0].result_impact_area_global_targets).toEqual([
        { global_target_id: 9 },
        { global_target_id: 10 }
      ]);
    });

    it('should map global_target_ids when provided', async () => {
      apiService.GET_Oicr.mockResolvedValue({
        data: {
          result_impact_areas: [
            {
              impact_area_id: 7,
              impact_area_score_id: 1,
              global_target_ids: [4, 5]
            }
          ]
        }
      } as any);
      jest.spyOn(component, 'loadContactPersons').mockResolvedValue();

      await component.getData();

      expect(component.body().result_impact_areas![0]).toEqual({
        impact_area_id: 7,
        impact_area_score_id: 1,
        result_impact_area_global_targets: [{ global_target_id: 4 }, { global_target_id: 5 }]
      });
    });
  });

  describe('saveData', () => {
    it('should save data and stay on page when no navigation param', async () => {
      submissionService.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_Oicr.mockResolvedValue({ successfulRequest: true } as any);
      const getDataSpy = jest.spyOn(component, 'getData').mockResolvedValue();

      component.quantifications.set([{ number: 1, unit: 'kg', comments: 'c1' }]);
      component.extrapolatedEstimates.set([{ number: 2, unit: 'ha', comments: 'c2' }]);

      await component.saveData();

      expect(apiService.PATCH_Oicr).toHaveBeenCalled();
      expect(getDataSpy).toHaveBeenCalled();
      expect(actionsService.showToast).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'OICR Details',
        detail: 'Data saved successfully'
      });
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('should map null number and empty unit/comments to payload defaults (cover ?? 0 and ?? "")', async () => {
      submissionService.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_Oicr.mockResolvedValue({ successfulRequest: true } as any);
      jest.spyOn(component, 'getData').mockResolvedValue();

      component.quantifications.set([{ number: null, unit: '', comments: '' }]);
      component.extrapolatedEstimates.set([{ number: null, unit: '', comments: '' }]);
      component.body.set({} as any);

      await component.saveData();

      const payload = (apiService.PATCH_Oicr as jest.Mock).mock.calls[0][1];
      expect(payload.actual_count[0]).toEqual({ quantification_number: 0, unit: '', description: '' });
      expect(payload.extrapolate_estimates[0]).toEqual({ quantification_number: 0, unit: '', description: '' });
      expect(payload.result_impact_areas).toEqual([]);
    });

    it('should map payload with undefined unit and comments (cover ?? in map)', async () => {
      submissionService.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_Oicr.mockResolvedValue({ successfulRequest: true } as any);
      jest.spyOn(component, 'getData').mockResolvedValue();

      component.quantifications.set([{ number: 5, unit: undefined as any, comments: undefined as any }]);
      component.extrapolatedEstimates.set([{ number: 10, unit: undefined as any, comments: undefined as any }]);
      component.body.set({} as any);

      await component.saveData();

      const payload = (apiService.PATCH_Oicr as jest.Mock).mock.calls[0][1];
      expect(payload.actual_count[0]).toEqual({ quantification_number: 5, unit: '', description: '' });
      expect(payload.extrapolate_estimates[0]).toEqual({ quantification_number: 10, unit: '', description: '' });
    });

    it('should not proceed when PATCH_Oicr fails', async () => {
      submissionService.isEditableStatus.mockReturnValue(true);
      apiService.PATCH_Oicr.mockResolvedValue({ successfulRequest: false } as any);
      const getDataSpy = jest.spyOn(component, 'getData').mockResolvedValue();
      component.quantifications.set([{ number: 1, unit: 'kg', comments: 'q' }]);
      component.extrapolatedEstimates.set([{ number: 2, unit: 'ha', comments: 'e' }]);

      await component.saveData();

      expect(apiService.PATCH_Oicr).toHaveBeenCalledWith(
        expect.any(Number),
        expect.objectContaining({
          extrapolate_estimates: [{ quantification_number: 2, unit: 'ha', description: 'e' }]
        })
      );
      expect(getDataSpy).not.toHaveBeenCalled();
    });

    it('should navigate back and next with query params', async () => {
      submissionService.isEditableStatus.mockReturnValue(false);
      const route = TestBed.inject(ActivatedRoute) as ActivatedRoute;
      // @ts-expect-error override mock
      (route.snapshot.queryParamMap.get as any) = jest.fn().mockReturnValue('v1');

      await component.saveData('back');
      expect(router.navigate).toHaveBeenCalledWith(
        ['result', cacheService.currentResultId(), 'alliance-alignment'],
        { queryParams: { version: 'v1' }, replaceUrl: true }
      );

      await component.saveData('next');
      expect(router.navigate).toHaveBeenCalledWith(
        ['result', cacheService.currentResultId(), 'partners'],
        { queryParams: { version: 'v1' }, replaceUrl: true }
      );
    });
  });

  describe('clearOicrSelection', () => {
    it('should reset external_oicr_id to 0', () => {
      component.body.set({
        ...component.body(),
        link_result: { external_oicr_id: 123 }
      } as any);

      component.clearOicrSelection();

      expect(component.body().link_result.external_oicr_id).toBe(0);
    });

    // Defense-in-depth method guard (R-RC-014 / T-15 "#rows clear icon" — the template-level
    // guard in oicr-form-fields.component.html:103 already hides the icon, but the handler
    // itself must also refuse to act if ever invoked directly (mirrors onDeleteContactPerson()'s
    // and onAddContactPerson()'s own method-level guards). Never verified anywhere else: the
    // outer describe block stubs the template to '', so the projected #rows icon is never
    // rendered here, and the T-07 "real template" suite only proves the icon is hidden — not
    // that clearOicrSelection() itself is safe if called some other way.
    it('should no-op for an external result even if invoked directly (defense-in-depth)', () => {
      cacheService.isExternalResult.mockReturnValue(true);
      component.body.set({
        ...component.body(),
        link_result: { external_oicr_id: 123 }
      } as any);

      component.clearOicrSelection();

      expect(component.body().link_result.external_oicr_id).toBe(123);
    });

    it('should no-op for a STAR result in a non-editable status even if invoked directly (defense-in-depth)', () => {
      cacheService.isExternalResult.mockReturnValue(false);
      submissionService.isEditableStatus.mockReturnValue(false);
      component.body.set({
        ...component.body(),
        link_result: { external_oicr_id: 123 }
      } as any);

      component.clearOicrSelection();

      expect(component.body().link_result.external_oicr_id).toBe(123);
    });

    it('should still reset for a STAR result in an editable status (regression)', () => {
      cacheService.isExternalResult.mockReturnValue(false);
      submissionService.isEditableStatus.mockReturnValue(true);
      component.body.set({
        ...component.body(),
        link_result: { external_oicr_id: 123 }
      } as any);

      component.clearOicrSelection();

      expect(component.body().link_result.external_oicr_id).toBe(0);
    });
  });
});

// ---------------------------------------------------------------------------
// T-07 (R-RC-003 / R-RC-004) — real-template disabled-binding assertions.
//
// The suite above intentionally stubs OicrDetailsComponent's template to ''
// (see `TestBed.overrideComponent(OicrDetailsComponent, { set: { template: '' } })`)
// to avoid instantiating the full child-component dependency graph (SelectComponent,
// InputComponent, OicrFormFieldsComponent, ImpactAreasComponent, etc. each pull in
// their own services). That means the actual `[disabled]` expressions written in
// oicr-details.component.html are never exercised anywhere else.
//
// To prove those two concrete bindings (MEL Regional Expert / SharePoint Folder Link
// admin fields, and the authors/contact table) without dragging in every real child's
// DI graph, this block renders the REAL production template but swaps only the child
// components for minimal same-selector stand-ins (a standard shallow-render technique).
// NO_ERRORS_SCHEMA covers any of their other inputs/outputs not explicitly redeclared.
// ---------------------------------------------------------------------------

@Component({ selector: 'app-form-header', standalone: true, template: '' })
class FakeFormHeaderComponent {}

@Component({ selector: 'app-select', standalone: true, template: '' })
class FakeSelectComponent {
  @Input() disabled = false;
  @Input() signal: unknown;
  @Input() isRequired = false;
  @Input() optionValue: unknown;
}

@Component({ selector: 'app-input', standalone: true, template: '' })
class FakeInputComponent {
  @Input() disabled = false;
  @Input() signal: unknown;
  @Input() optionValue: unknown;
}

@Component({ selector: 'app-oicr-form-fields', standalone: true, template: '' })
class FakeOicrFormFieldsComponent {
  @Input() body: unknown;
  @Input() oicrNoOptionValue: unknown;
  @Input() taggingOptionValue: unknown;
  @Input() oicrOptionValue: unknown;
  @Input() maturityLevelOptionValue: unknown;
  @Input() outcomeImpactOptionValue: unknown;
  @Input() shortOutcomeOptionValue: unknown;
  @Input() generalCommentOptionValue: unknown;
  @Input() showMaturityLevel = false;
  @Input() showGeneralComment = false;
  @Input() showShortOutcome = false;
  @Input() showOicrNo = false;
  @Input() isOicrNoDisabled = false;
  @Input() disabled = false;
  @Input() clearOicrSelection: unknown;
}

@Component({ selector: 'app-quantification-item', standalone: true, template: '' })
class FakeQuantificationItemComponent {
  @Input() quantification: unknown;
  @Input() quantNumber = 1;
  @Input() headerLabel = '';
  @Input() disabled = false;
  @Output() update = new EventEmitter<unknown>();
  @Output() delete = new EventEmitter<void>();
}

@Component({ selector: 'app-authors-contact-persons-table', standalone: true, template: '' })
class FakeAuthorsContactPersonsTableComponent {
  @Input() rows: unknown;
  @Input() disabled = false;
  @Output() addClicked = new EventEmitter<void>();
  @Output() deleteClicked = new EventEmitter<unknown>();
}

@Component({ selector: 'app-impact-areas', standalone: true, template: '' })
class FakeImpactAreasComponent {
  @Input() body: unknown;
  @Input() disabled = false;
}

@Component({ selector: 'app-navigation-buttons', standalone: true, template: '' })
class FakeNavigationButtonsComponent {
  @Output() back = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
  @Output() save = new EventEmitter<void>();
}

describe('OicrDetailsComponent — real template disabled bindings (T-07)', () => {
  let fixture: ComponentFixture<OicrDetailsComponent>;
  let component: OicrDetailsComponent;

  function render(opts: { isAdmin: boolean; isExternalResult: boolean; isEditableStatus: boolean }) {
    const mockCacheService = {
      getCurrentNumericResultId: jest.fn().mockReturnValue(1),
      currentResultId: jest.fn().mockReturnValue('1'),
      isExternalResult: jest.fn().mockReturnValue(opts.isExternalResult)
    } as unknown as jest.Mocked<CacheService>;

    const mockApiService = {
      GET_AutorContact: jest.fn().mockResolvedValue({ data: [] }),
      DELETE_AutorContact: jest.fn(),
      POST_AutorContact: jest.fn(),
      GET_Oicr: jest.fn().mockResolvedValue({ data: {} }),
      PATCH_Oicr: jest.fn()
    } as unknown as jest.Mocked<ApiService>;

    const mockSubmissionService = {
      isEditableStatus: jest.fn().mockReturnValue(opts.isEditableStatus)
    } as unknown as jest.Mocked<SubmissionService>;

    const mockActionsService = { showToast: jest.fn() } as unknown as jest.Mocked<ActionsService>;
    const mockVersionWatcher = { onVersionChange: jest.fn() } as unknown as jest.Mocked<VersionWatcherService>;
    const mockAllModalsService = {
      toggleModal: jest.fn(),
      setAddContactPersonConfirm: jest.fn(),
      setDisabledAddContactPerson: jest.fn()
    } as unknown as jest.Mocked<AllModalsService>;
    const mockRolesService = { isAdmin: jest.fn().mockReturnValue(opts.isAdmin) } as unknown as jest.Mocked<RolesService>;
    const mockRouter = { navigate: jest.fn() } as unknown as jest.Mocked<Router>;
    const mockActivatedRoute: Partial<ActivatedRoute> = {
      snapshot: {
        // @ts-expect-error minimal queryParamMap mock
        queryParamMap: { get: jest.fn().mockReturnValue(null) }
      } as any
    };
    const mockServiceLocator = { getService: jest.fn() } as unknown as jest.Mocked<ServiceLocatorService>;

    TestBed.overrideComponent(OicrDetailsComponent, {
      set: {
        imports: [
          FormsModule,
          CheckboxModule,
          AccordionModule,
          NgTemplateOutlet,
          FakeFormHeaderComponent,
          FakeSelectComponent,
          FakeInputComponent,
          FakeOicrFormFieldsComponent,
          FakeQuantificationItemComponent,
          FakeAuthorsContactPersonsTableComponent,
          FakeImpactAreasComponent,
          FakeNavigationButtonsComponent
        ]
      }
    });

    TestBed.configureTestingModule({
      imports: [OicrDetailsComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: CacheService, useValue: mockCacheService },
        { provide: ApiService, useValue: mockApiService },
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: ActionsService, useValue: mockActionsService },
        { provide: VersionWatcherService, useValue: mockVersionWatcher },
        { provide: AllModalsService, useValue: mockAllModalsService },
        { provide: RolesService, useValue: mockRolesService },
        { provide: Router, useValue: mockRouter },
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: ServiceLocatorService, useValue: mockServiceLocator }
      ]
    });

    fixture = TestBed.createComponent(OicrDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  function melRegionalExpertSelect(f: ComponentFixture<OicrDetailsComponent>): FakeSelectComponent {
    return f.debugElement.query(By.directive(FakeSelectComponent)).componentInstance as FakeSelectComponent;
  }

  function sharepointInput(f: ComponentFixture<OicrDetailsComponent>): FakeInputComponent {
    // The SharePoint Folder Link field is the first `app-input` in document order
    // (the second, `for_external_use_description`, only renders conditionally).
    return f.debugElement.queryAll(By.directive(FakeInputComponent))[0].componentInstance as FakeInputComponent;
  }

  function authorsContactTable(f: ComponentFixture<OicrDetailsComponent>): FakeAuthorsContactPersonsTableComponent {
    return f.debugElement.query(By.directive(FakeAuthorsContactPersonsTableComponent)).componentInstance as FakeAuthorsContactPersonsTableComponent;
  }

  function oicrFormFields(f: ComponentFixture<OicrDetailsComponent>): FakeOicrFormFieldsComponent {
    return f.debugElement.query(By.directive(FakeOicrFormFieldsComponent)).componentInstance as FakeOicrFormFieldsComponent;
  }

  function quantificationItems(f: ComponentFixture<OicrDetailsComponent>): FakeQuantificationItemComponent[] {
    return f.debugElement.queryAll(By.directive(FakeQuantificationItemComponent)).map(de => de.componentInstance as FakeQuantificationItemComponent);
  }

  it('R-RC-004 AC.1 — disables MEL Regional Expert + SharePoint Folder Link for an admin on an external result', () => {
    const f = render({ isAdmin: true, isExternalResult: true, isEditableStatus: true });

    expect(melRegionalExpertSelect(f).disabled).toBe(true);
    expect(sharepointInput(f).disabled).toBe(true);
  });

  it('R-RC-004 AC.2 — leaves MEL Regional Expert + SharePoint Folder Link editable for an admin on a STAR result', () => {
    const f = render({ isAdmin: true, isExternalResult: false, isEditableStatus: true });

    expect(melRegionalExpertSelect(f).disabled).toBe(false);
    expect(sharepointInput(f).disabled).toBe(false);
  });

  it('keeps MEL Regional Expert + SharePoint Folder Link disabled for a non-admin regardless of platform', () => {
    const f = render({ isAdmin: false, isExternalResult: false, isEditableStatus: true });

    expect(melRegionalExpertSelect(f).disabled).toBe(true);
    expect(sharepointInput(f).disabled).toBe(true);
  });

  it('R-RC-003 AC.1/AC.2 — disables the authors/contact table for an external result', () => {
    const f = render({ isAdmin: true, isExternalResult: true, isEditableStatus: true });

    expect(authorsContactTable(f).disabled).toBe(true);
  });

  it('R-RC-003 AC.3 — leaves the authors/contact table enabled for a STAR result in an editable status', () => {
    const f = render({ isAdmin: true, isExternalResult: false, isEditableStatus: true });

    expect(authorsContactTable(f).disabled).toBe(false);
  });

  it('R-RC-003 AC.3 (revised) — MAY now also disable the authors/contact table Add control for a STAR result in a non-editable status (accepted tightening, not a regression)', () => {
    const f = render({ isAdmin: true, isExternalResult: false, isEditableStatus: false });

    expect(authorsContactTable(f).disabled).toBe(true);
  });

  it('F-3: disables the shared oicr-form-fields controls for an external result', () => {
    const f = render({ isAdmin: true, isExternalResult: true, isEditableStatus: true });

    expect(oicrFormFields(f).disabled).toBe(true);
  });

  it('F-3: leaves the shared oicr-form-fields controls enabled for a STAR result in an editable status', () => {
    const f = render({ isAdmin: true, isExternalResult: false, isEditableStatus: true });

    expect(oicrFormFields(f).disabled).toBe(false);
  });

  it('F-4: disables the quantification and extrapolated-estimate items for an external result', () => {
    const f = render({ isAdmin: true, isExternalResult: true, isEditableStatus: true });
    component.quantifications.set([{ number: 1, unit: 'kg', comments: 'actual' }]);
    component.extrapolatedEstimates.set([{ number: 2, unit: 'tons', comments: 'extrapolated' }]);
    f.detectChanges();

    const items = quantificationItems(f);
    expect(items.length).toBe(2);
    items.forEach(item => expect(item.disabled).toBe(true));
  });

  it('F-4: leaves the quantification and extrapolated-estimate items enabled for a STAR result in an editable status', () => {
    const f = render({ isAdmin: true, isExternalResult: false, isEditableStatus: true });
    component.quantifications.set([{ number: 1, unit: 'kg', comments: 'actual' }]);
    component.extrapolatedEstimates.set([{ number: 2, unit: 'tons', comments: 'extrapolated' }]);
    f.detectChanges();

    const items = quantificationItems(f);
    expect(items.length).toBe(2);
    items.forEach(item => expect(item.disabled).toBe(false));
  });
});


