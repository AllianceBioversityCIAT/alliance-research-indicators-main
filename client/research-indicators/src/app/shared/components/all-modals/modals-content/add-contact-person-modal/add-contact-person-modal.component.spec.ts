import { ComponentFixture, TestBed, fakeAsync, tick, flush } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { AddContactPersonModalComponent, ProperCasePipe } from './add-contact-person-modal.component';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { signal } from '@angular/core';
import { ContactPersonFormData } from '@shared/interfaces/contact-person.interface';

describe('AddContactPersonModalComponent', () => {
  let component: AddContactPersonModalComponent;
  let fixture: ComponentFixture<AddContactPersonModalComponent>;
  let allModalsServiceMock: jest.Mocked<AllModalsService>;

  beforeEach(async () => {
    const modalConfigSignal = signal({
      addContactPerson: {
        isOpen: false,
        title: 'Add Contact Person'
      }
    } as any);

    allModalsServiceMock = {
      setContactPersonModalData: jest.fn(),
      addContactPersonConfirm: jest.fn(),
      toggleModal: jest.fn(),
      isModalOpen: jest.fn((modalName: string) => {
        const config = modalConfigSignal();
        return config[modalName as keyof typeof config] || { isOpen: false };
      }),
      modalConfig: modalConfigSignal
    } as any;

    await TestBed.configureTestingModule({
      imports: [AddContactPersonModalComponent, HttpClientTestingModule],
      providers: [
        { provide: AllModalsService, useValue: allModalsServiceMock }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddContactPersonModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ProperCasePipe', () => {
    let pipe: ProperCasePipe;

    beforeEach(() => {
      pipe = new ProperCasePipe();
    });

    it('should return empty string for null value', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('should return empty string for undefined value', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('should return empty string for empty string', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('should transform single word to proper case', () => {
      expect(pipe.transform('hello')).toBe('Hello');
    });

    it('should transform multiple words to proper case', () => {
      expect(pipe.transform('hello world')).toBe('Hello World');
    });

    it('should handle words with multiple spaces', () => {
      expect(pipe.transform('hello   world')).toBe('Hello World');
    });

    it('should handle leading and trailing spaces', () => {
      expect(pipe.transform('  hello world  ')).toBe('Hello World');
    });

    it('should handle uppercase input', () => {
      expect(pipe.transform('HELLO WORLD')).toBe('Hello World');
    });

    it('should handle mixed case input', () => {
      expect(pipe.transform('hElLo WoRlD')).toBe('Hello World');
    });

    it('should handle single character', () => {
      expect(pipe.transform('a')).toBe('A');
    });

    it('should handle empty parts in split', () => {
      expect(pipe.transform('hello  world')).toBe('Hello World');
    });

    it('should handle part that is empty string after split', () => {
      // This tests the ternary operator in line 17: part ? part.charAt(0)...
      expect(pipe.transform('hello   world')).toBe('Hello World');
    });

    it('should return empty string for whitespace-only input (covers line 17 falsy part branch)', () => {
      // "   ".trim() => ""; "".split(/\s+/) => [""]; map part "" => part ? ... : ''
      expect(pipe.transform('   ')).toBe('');
    });
  });

  describe('constructor effects', () => {
    it('should call setContactPersonModalData when body changes', fakeAsync(() => {
      const newData: ContactPersonFormData = {
        contact_person_id: 1,
        role_id: 2
      };

      component.body.set(newData);
      tick();
      flush();
      fixture.detectChanges();

      expect(allModalsServiceMock.setContactPersonModalData).toHaveBeenCalledWith(newData);
    }));

    it('should clear data when modal closes', fakeAsync(() => {
      // Set initial data
      component.body.set({
        contact_person_id: 1,
        role_id: 2
      });
      tick();
      flush();

      // First, set modal as open to establish wasOpen = true
      const currentConfig = allModalsServiceMock.modalConfig();
      allModalsServiceMock.modalConfig.set({
        ...currentConfig,
        addContactPerson: {
          isOpen: true,
          title: 'Add Contact Person'
        }
      });
      tick();
      flush();
      fixture.detectChanges();

      // Verify wasOpen is now true
      expect((component as any).wasOpen).toBe(true);

      // Now close the modal - this should trigger clearData
      const updatedConfig = allModalsServiceMock.modalConfig();
      allModalsServiceMock.modalConfig.set({
        ...updatedConfig,
        addContactPerson: {
          isOpen: false,
          title: 'Add Contact Person'
        }
      });

      tick();
      flush();
      fixture.detectChanges();

      expect(component.body().contact_person_id).toBeNull();
      expect(component.body().role_id).toBeNull();
    }));

    it('should not clear data when modal was not open', fakeAsync(() => {
      const initialData: ContactPersonFormData = {
        contact_person_id: 1,
        role_id: 2
      };

      component.body.set(initialData);
      (component as any).wasOpen = false;

      allModalsServiceMock.isModalOpen.mockReturnValue({ isOpen: false } as any);
      const currentConfig = allModalsServiceMock.modalConfig();
      allModalsServiceMock.modalConfig.set({
        ...currentConfig,
        addContactPerson: {
          isOpen: false,
          title: 'Add Contact Person'
        }
      });

      tick();
      flush();
      fixture.detectChanges();

      // Data should not be cleared because wasOpen was false
      expect(component.body().contact_person_id).toBe(1);
      expect(component.body().role_id).toBe(2);
    }));
  });

  describe('clearData', () => {
    it('should reset body to initial state', () => {
      component.body.set({
        contact_person_id: 1,
        role_id: 2
      });

      (component as any).clearData();

      expect(component.body().contact_person_id).toBeNull();
      expect(component.body().role_id).toBeNull();
    });
  });

  describe('getBodyData', () => {
    it('should return current body data', () => {
      const data: ContactPersonFormData = {
        contact_person_id: 1,
        role_id: 2
      };

      component.body.set(data);

      expect(component.getBodyData()).toEqual(data);
    });
  });

  describe('onConfirm', () => {
    it('should call addContactPersonConfirm with body data', () => {
      const data: ContactPersonFormData = {
        contact_person_id: 1,
        role_id: 2
      };

      component.body.set(data);
      component.onConfirm();

      expect(allModalsServiceMock.addContactPersonConfirm).toHaveBeenCalledWith(data);
    });

    it('should not throw if addContactPersonConfirm is undefined', () => {
      allModalsServiceMock.addContactPersonConfirm = undefined;

      expect(() => component.onConfirm()).not.toThrow();
    });
  });

  describe('onCancel', () => {
    it('should call toggleModal with addContactPerson', () => {
      component.onCancel();

      expect(allModalsServiceMock.toggleModal).toHaveBeenCalledWith('addContactPerson');
    });
  });
});

