import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';

import { OrganizationItemComponent } from './organization-item.component';
import { SubmissionService } from '@shared/services/submission.service';
import { GetInnovationDetails, InstitutionType } from '@shared/interfaces/get-innovation-details.interface';
import { GetInstitutionsService } from '@shared/services/control-list/get-institutions.service';
import { GetInstitutionTypesService } from '@shared/services/control-list/get-institution-types.service';
import { GetClarisaInstitutionsSubTypesService } from '@shared/services/get-clarisa-institutions-subtypes.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CheckboxChangeEvent } from 'primeng/checkbox';

describe('OrganizationItemComponent', () => {
  let component: OrganizationItemComponent;
  let fixture: ComponentFixture<OrganizationItemComponent>;

  let submissionService: jest.Mocked<SubmissionService>;
  let institutionsService: jest.Mocked<GetInstitutionsService>;
  let institutionTypesService: jest.Mocked<GetInstitutionTypesService>;
  let subTypesService: jest.Mocked<GetClarisaInstitutionsSubTypesService>;
  let allModalsService: jest.Mocked<AllModalsService>;

  const createInstitution = (partial?: Partial<InstitutionType>): InstitutionType => {
    return Object.assign(new InstitutionType(), partial);
  };

  beforeEach(async () => {
    const mockSubmissionService: jest.Mocked<SubmissionService> = {
      isEditableStatus: jest.fn().mockReturnValue(true)
      // @ts-expect-error - not all methods are needed for this test
    } as jest.Mocked<SubmissionService>;

    const mockInstitutionsService: jest.Mocked<GetInstitutionsService> = {
      list: jest.fn().mockReturnValue([
        { institution_id: 1, name: 'Inst 1', html_full_name: 'Inst 1' } as any,
        { institution_id: 2, name: 'Inst 2', html_full_name: 'Inst 2' } as any
      ])
      // @ts-expect-error - partial mock
    } as jest.Mocked<GetInstitutionsService>;

    const mockInstitutionTypesService: jest.Mocked<GetInstitutionTypesService> = {
      list: jest.fn().mockReturnValue([
        { code: 10, name: 'Type 10' } as any,
        { code: 78, name: 'Other' } as any
      ])
      // @ts-expect-error - partial mock
    } as jest.Mocked<GetInstitutionTypesService>;

    const mockSubTypesService: jest.Mocked<GetClarisaInstitutionsSubTypesService> = {
      getSubTypes: jest.fn().mockResolvedValue(undefined),
      list: jest.fn().mockReturnValue([])
      // @ts-expect-error - partial mock
    } as jest.Mocked<GetClarisaInstitutionsSubTypesService>;

    const mockAllModalsService: jest.Mocked<AllModalsService> = {
      setPartnerRequestSection: jest.fn(),
      openModal: jest.fn()
      // @ts-expect-error - partial mock
    } as jest.Mocked<AllModalsService>;

    await TestBed.configureTestingModule({
      imports: [OrganizationItemComponent],
      providers: [
        { provide: SubmissionService, useValue: mockSubmissionService },
        { provide: GetInstitutionsService, useValue: mockInstitutionsService },
        { provide: GetInstitutionTypesService, useValue: mockInstitutionTypesService },
        { provide: GetClarisaInstitutionsSubTypesService, useValue: mockSubTypesService },
        { provide: AllModalsService, useValue: mockAllModalsService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrganizationItemComponent);
    component = fixture.componentInstance;

    submissionService = TestBed.inject(SubmissionService) as jest.Mocked<SubmissionService>;
    institutionsService = TestBed.inject(GetInstitutionsService) as jest.Mocked<GetInstitutionsService>;
    institutionTypesService = TestBed.inject(GetInstitutionTypesService) as jest.Mocked<GetInstitutionTypesService>;
    subTypesService = TestBed.inject(GetClarisaInstitutionsSubTypesService) as jest.Mocked<GetClarisaInstitutionsSubTypesService>;
    allModalsService = TestBed.inject(AllModalsService) as jest.Mocked<AllModalsService>;

    // Default inputs
    component.index = 0;
    component.organizationNumber = 1;
    component.organization = createInstitution({
      institution_type_id: 10,
      institution_id: 1
    });
    component.bodySignal = signal(
      Object.assign(new GetInnovationDetails(), {
        institution_types: [createInstitution({ institution_type_id: 10, institution_id: 1 })]
      })
    );
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit & initializeSubTypes', () => {
    it('should set body from organization and initialize subtypes', fakeAsync(() => {
      const spyInit = jest.spyOn<any, any>(component as any, 'initializeSubTypes');

      component.ngOnInit();
      tick();

      expect(component.body().institution_type_id).toBe(10);
      expect(spyInit).toHaveBeenCalledWith(component.organization);
    }));

    it('should set showSubTypeSelect to true when subtypes exist', fakeAsync(async () => {
      const org = createInstitution({ institution_type_id: 5, sub_institution_type_id: 99 });
      subTypesService.list.mockReturnValue([{ code: 99, name: 'Sub' } as any]);

      // @ts-expect-error accessing private method for coverage
      await component['initializeSubTypes'](org);

      expect(subTypesService.getSubTypes).toHaveBeenCalledWith(2, 5);
      expect(component.showSubTypeSelect()).toBe(true);
      expect(component.body().sub_institution_type_id).toBe(99);
    }));

    it('should clear sub_institution_type_id when there are no subtypes', fakeAsync(async () => {
      const org = createInstitution({ institution_type_id: 5, sub_institution_type_id: 99 });
      subTypesService.list.mockReturnValue([]);

      // @ts-expect-error accessing private method for coverage
      await component['initializeSubTypes'](org);

      expect(component.showSubTypeSelect()).toBe(false);
      expect(component.body().sub_institution_type_id).toBeUndefined();
    }));

    it('should set showSubTypeSelect to false when no institution_type_id', async () => {
      const org = createInstitution({});

      // @ts-expect-error accessing private method for coverage
      await component['initializeSubTypes'](org);

      expect(component.showSubTypeSelect()).toBe(false);
    });

    it('ngOnInit should catch initializeSubTypes error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      subTypesService.getSubTypes.mockRejectedValue(new Error('Network error'));

      component.organization = createInstitution({ institution_type_id: 5 });
      component.ngOnInit();
      await new Promise(resolve => setImmediate(resolve));

      expect(consoleSpy).toHaveBeenCalledWith('Error initializing subtypes:', expect.any(Error));
      consoleSpy.mockRestore();
    });
  });

  describe('syncBody effect', () => {
    it('should sync body when parent institution changes', fakeAsync(() => {
      component.index = 0;
      component.body.set(createInstitution({ institution_type_id: 10, institution_id: 1 }));
      component.bodySignal.set(
        Object.assign(new GetInnovationDetails(), {
          institution_types: [createInstitution({ institution_type_id: 10, institution_id: 2 })]
        })
      );

      fixture.detectChanges();
      tick();

      expect(component.body().institution_id).toBe(2);
    }));

    it('should replace body when institution type changes', fakeAsync(() => {
      const parentOrg = createInstitution({ institution_type_id: 20, institution_id: 3 });
      component.index = 0;
      component.body.set(createInstitution({ institution_type_id: 10, institution_id: 1 }));
      component.bodySignal.set(
        Object.assign(new GetInnovationDetails(), {
          institution_types: [parentOrg]
        })
      );

      const initSpy = jest.spyOn<any, any>(component as any, 'initializeSubTypes');

      fixture.detectChanges();
      tick();

      expect(component.body().institution_type_id).toBe(20);
      expect(initSpy).toHaveBeenCalledWith(parentOrg);
    }));

    it('should sync from parent preserving is_organization_known when type and institution match', fakeAsync(() => {
      const parentOrg = createInstitution({
        institution_type_id: 20,
        institution_id: 3,
        is_organization_known: false,
        institution_type_custom_name: 'From parent'
      });
      component.index = 0;
      component.body.set(
        createInstitution({
          institution_type_id: 20,
          institution_id: 3,
          is_organization_known: true,
          institution_type_custom_name: 'From body'
        })
      );
      component.bodySignal.set(
        Object.assign(new GetInnovationDetails(), {
          institution_types: [parentOrg]
        })
      );

      fixture.detectChanges();
      tick();

      expect(component.body().institution_type_custom_name).toBe('From parent');
    }));

    it('should early return when index is null', fakeAsync(() => {
      component.index = null;
      component.bodySignal.set(new GetInnovationDetails());

      fixture.detectChanges();
      tick();

      // No error means effect handled null index gracefully
      expect(component).toBeTruthy();
    }));

    it('syncBodyFromParent should preserve is_organization_known when type and institution match', () => {
      const parentOrg = createInstitution({
        institution_type_id: 20,
        institution_id: 3,
        is_organization_known: false
      });
      component.index = 0;
      component.bodySignal.set(
        Object.assign(new GetInnovationDetails(), { institution_types: [parentOrg] })
      );
      component.body.set(
        createInstitution({
          institution_type_id: 20,
          institution_id: 3,
          is_organization_known: true
        })
      );
      component.syncBodyFromParent();
      expect(component.body().is_organization_known).toBe(true);
    });
  });

  describe('onChange effect', () => {

    it('should not modify institution_types when index is null', fakeAsync(() => {
      const initial = Object.assign(new GetInnovationDetails(), {
        institution_types: [createInstitution({ institution_id: 1 })]
      });
      component.index = null;
      component.bodySignal.set(initial);

      fixture.detectChanges();
      tick();

      const body = component.bodySignal();
      expect(body.institution_types).toEqual(initial.institution_types);
    }));

    it('should pad institution_types when index is beyond length', fakeAsync(() => {
      const initial = Object.assign(new GetInnovationDetails(), {
        institution_types: [createInstitution({ institution_id: 1 })]
      });
      component.index = 2;
      component.bodySignal.set(initial);

      fixture.detectChanges();
      tick();

      const body = component.bodySignal();
      expect(body.institution_types!.length).toBe(3);
    }));

    it('should init institution_types and pad when undefined', fakeAsync(() => {
      const initial = Object.assign(new GetInnovationDetails(), {
        institution_types: undefined as any
      });
      component.index = 0;
      component.bodySignal.set(initial);

      fixture.detectChanges();
      tick();

      const body = component.bodySignal();
      expect(Array.isArray(body.institution_types)).toBe(true);
      expect(body.institution_types!.length).toBe(1);
    }));

    it('should pad institution_types multiple times when index is beyond empty array', fakeAsync(() => {
      const initial = Object.assign(new GetInnovationDetails(), {
        institution_types: [] as any
      });
      component.index = 2;
      component.bodySignal.set(initial);

      fixture.detectChanges();
      tick();

      const body = component.bodySignal();
      expect(body.institution_types!.length).toBe(3);
    }));
  });

  describe('basic methods', () => {
    it('should emit deleteOrganizationEvent', () => {
      jest.spyOn(component.deleteOrganizationEvent, 'emit');
      component.deleteOrganization();
      expect(component.deleteOrganizationEvent.emit).toHaveBeenCalled();
    });

    it('should validate field emptiness in isFieldInvalid', () => {
      component.body.set(createInstitution({ institution_type_custom_name: '' }));
      expect(component.isFieldInvalid()).toBe(true);

      component.body.set(createInstitution({ institution_type_custom_name: '  ' }));
      expect(component.isFieldInvalid()).toBe(true);

      component.body.set(createInstitution({ institution_type_custom_name: 'name' }));
      expect(component.isFieldInvalid()).toBe(false);
    });

    it('should set section and open modal', () => {
      component.setSectionAndOpenModal('Partners');
      expect(allModalsService.setPartnerRequestSection).toHaveBeenCalledWith('Partners');
      expect(allModalsService.openModal).toHaveBeenCalledWith('requestPartner');
    });
  });

  describe('setValue', () => {
    it('should update institution_type_custom_name and bodySignal after debounce', fakeAsync(() => {
      const initialBody = createInstitution({ institution_type_custom_name: 'Old' });
      component.body.set(initialBody);

      const initialSignal = Object.assign(new GetInnovationDetails(), {
        institution_types: [initialBody]
      });
      component.bodySignal.set(initialSignal);
      component.index = 0;

      component.setValue('New Name');

      // Avanza el timeout interno de 300ms
      tick(350);

      expect(component.body().institution_type_custom_name).toBe('New Name');
      const updated = component.bodySignal();
      expect(updated.institution_types![0].institution_type_custom_name).toBe('New Name');
    }));

    it('should clear previous timeout when setValue is called again before debounce', fakeAsync(() => {
      component.index = 0;
      component.body.set(createInstitution({ institution_type_custom_name: 'Initial' }));
      component.bodySignal.set(
        Object.assign(new GetInnovationDetails(), {
          institution_types: [createInstitution({ institution_type_custom_name: 'Initial' })]
        })
      );

      component.setValue('First');
      component.setValue('Second');
      tick(350);

      expect(component.body().institution_type_custom_name).toBe('Second');
    }));

    it('should not update body when setValue equals current institution_type_custom_name', fakeAsync(() => {
      component.index = 0;
      component.body.set(createInstitution({ institution_type_custom_name: 'Same' }));
      component.bodySignal.set(
        Object.assign(new GetInnovationDetails(), {
          institution_types: [createInstitution({ institution_type_custom_name: 'Same' })]
        })
      );

      component.setValue('Same');
      tick(350);

      expect(component.body().institution_type_custom_name).toBe('Same');
    }));

    it('should run setValue debounce path with institution_types undefined (cover line 147)', fakeAsync(() => {
      component.index = 0;
      component.body.set(createInstitution({ institution_type_custom_name: 'Old' }));
      component.bodySignal.set(Object.assign(new GetInnovationDetails(), { institution_types: undefined as any }));

      component.setValue('New');
      tick(350);

      expect(component.body().institution_type_custom_name).toBe('New');
      const body = component.bodySignal();
      expect(Array.isArray(body.institution_types)).toBe(true);
      expect(body.institution_types!.length).toBe(1);
      expect(body.institution_types![0].institution_type_custom_name).toBe('New');
    }));
  });

  describe('getters', () => {
    it('organizationMissing should be true when no institution_type_id', () => {
      component.body.set(createInstitution({ institution_type_id: undefined as any }));
      expect(component.organizationMissing).toBe(true);
    });

    it('organizationMissing should be false when institution_type_id exists', () => {
      component.body.set(createInstitution({ institution_type_id: 1 }));
      expect(component.organizationMissing).toBe(false);
    });

    it('subTypeMissing should be true when no sub_institution_type_id', () => {
      component.body.set(createInstitution({ sub_institution_type_id: undefined as any }));
      expect(component.subTypeMissing).toBe(true);
    });

    it('subTypeMissing should be false when sub_institution_type_id exists', () => {
      component.body.set(createInstitution({ sub_institution_type_id: 100 }));
      expect(component.subTypeMissing).toBe(false);
    });

    it('institutionMissing should be true when institution_id is falsy', () => {
      component.body.set(createInstitution({ institution_id: undefined as any }));
      expect(component.institutionMissing).toBe(true);
    });

    it('institutionMissing should be false when institution_id exists', () => {
      component.body.set(createInstitution({ institution_id: 1 }));
      expect(component.institutionMissing).toBe(false);
    });

    it('filteredInstitutions should return empty array when list() is falsy', () => {
      institutionsService.list.mockReturnValue(undefined as any);
      expect(component.filteredInstitutions()).toEqual([]);
    });

    it('getSelectedInstitution should return undefined when list is empty', () => {
      institutionsService.list.mockReturnValue([]);
      component.body.set(createInstitution({ institution_id: 99 }));
      expect(component.getSelectedInstitution()).toBeUndefined();
    });
  });

  describe('onInstitutionTypeChange', () => {
    it('should update body and bodySignal, and hide subType select when event is 78', fakeAsync(async () => {
      component.index = 0;
      component.body.set(
        createInstitution({
          institution_type_id: 10,
          institution_id: 1,
          institution_type_custom_name: 'Custom'
        })
      );

      await component.onInstitutionTypeChange(78);

      expect(component.body().institution_type_id).toBe(78);
      expect(component.body().institution_type_custom_name).toBe('Custom');
      expect(component.showSubTypeSelect()).toBe(false);

      const body = component.bodySignal();
      expect(body.institution_types![0].institution_type_id).toBe(78);
    }));

    it('should update bodySignal with institution_types from empty when undefined', () => {
      component.index = 0;
      component.body.set(createInstitution({ institution_type_id: 20, institution_id: 1 }));
      component.bodySignal.set(Object.assign(new GetInnovationDetails(), { institution_types: undefined as any }));

      component.onInstitutionTypeChange(20);

      const body = component.bodySignal();
      expect(body.institution_types).toEqual([expect.objectContaining({ institution_type_id: 20 })]);
    });

    it('should reset custom name and call initializeSubTypes when event is not 78', fakeAsync(async () => {
      const spyInit = jest.spyOn<any, any>(component as any, 'initializeSubTypes');
      component.index = 0;
      component.body.set(
        createInstitution({
          institution_type_id: 78,
          institution_id: 1,
          institution_type_custom_name: 'Custom'
        })
      );

      await component.onInstitutionTypeChange(10);

      expect(component.body().institution_type_id).toBe(10);
      expect(component.body().institution_type_custom_name).toBeUndefined();
      expect(spyInit).toHaveBeenCalled();
    }));
  });

  describe('institutions helpers', () => {
    it('getSelectedInstitution should return current institution', () => {
      component.body.set(createInstitution({ institution_id: 2 }));
      const inst = component.getSelectedInstitution();
      expect(inst?.institution_id).toBe(2);
    });

    it('getSelectedInstitution should return undefined when no match', () => {
      component.body.set(createInstitution({ institution_id: 999 }));
      const inst = component.getSelectedInstitution();
      expect(inst).toBeUndefined();
    });

    it('filteredInstitutions should return list from service', () => {
      const list = component.filteredInstitutions();
      expect(list.length).toBe(2);
      expect(institutionsService.list).toHaveBeenCalled();
    });

    it('getSelectedInstitution should return undefined when list is empty', () => {
      institutionsService.list.mockReturnValue([]);
      component.body.set(createInstitution({ institution_id: 1 }));
      expect(component.getSelectedInstitution()).toBeUndefined();
    });
  });

  describe('onInstitutionChange', () => {
    it('should update body and bodySignal with new institution id', () => {
      component.index = 0;
      component.body.set(createInstitution({ institution_id: 1 }));

      const initial = Object.assign(new GetInnovationDetails(), {
        institution_types: [createInstitution({ institution_id: 1 })]
      });
      component.bodySignal.set(initial);

      component.onInstitutionChange(2);

      expect(component.body().institution_id).toBe(2);
      const body = component.bodySignal();
      expect(body.institution_types![0].institution_id).toBe(2);
    });

    it('should only update body when index is null', () => {
      component.index = null;
      component.body.set(createInstitution({ institution_id: 1 }));
      const setSpy = jest.spyOn(component.bodySignal, 'update');

      component.onInstitutionChange(2);

      expect(component.body().institution_id).toBe(2);
      expect(setSpy).not.toHaveBeenCalled();
    });

    it('should update bodySignal using empty array when institution_types is undefined', () => {
      component.index = 0;
      component.body.set(createInstitution({ institution_id: 2 }));
      component.bodySignal.set(Object.assign(new GetInnovationDetails(), { institution_types: undefined as any }));

      component.onInstitutionChange(2);

      const body = component.bodySignal();
      expect(body.institution_types).toEqual([component.body()]);
    });
  });

  describe('onCheckboxChange', () => {
    it('should update is_organization_known and bodySignal', () => {
      component.index = 0;
      const initial = createInstitution({ is_organization_known: false });
      component.body.set(initial);

      component.bodySignal.set(
        Object.assign(new GetInnovationDetails(), {
          institution_types: [initial]
        })
      );

      const event = { checked: true } as CheckboxChangeEvent;
      component.onCheckboxChange(event);

      expect(component.body().is_organization_known).toBe(true);
      const body = component.bodySignal();
      expect(body.institution_types![0].is_organization_known).toBe(true);
    });

    it('should only update body when index is null', () => {
      component.index = null;
      component.body.set(createInstitution({ is_organization_known: false }));
      const setSpy = jest.spyOn(component.bodySignal, 'update');

      component.onCheckboxChange({ checked: true } as CheckboxChangeEvent);

      expect(component.body().is_organization_known).toBe(true);
      expect(setSpy).not.toHaveBeenCalled();
    });

    it('should update bodySignal using empty array when institution_types is undefined', () => {
      component.index = 0;
      component.body.set(createInstitution({ is_organization_known: true }));
      component.bodySignal.set(Object.assign(new GetInnovationDetails(), { institution_types: undefined as any }));

      component.onCheckboxChange({ checked: true } as CheckboxChangeEvent);

      const body = component.bodySignal();
      expect(body.institution_types).toEqual([component.body()]);
    });
  });
});


