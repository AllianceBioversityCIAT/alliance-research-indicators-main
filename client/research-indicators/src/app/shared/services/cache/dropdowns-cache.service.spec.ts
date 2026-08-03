import { TestBed } from '@angular/core/testing';
import { DropdownsCacheService } from './dropdowns-cache.service';
import { DropdownName } from '@ts-types/dropdown.types';

describe('DropdownsCacheService', () => {
  let service: DropdownsCacheService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DropdownsCacheService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should initialize with all dropdowns set to false', () => {
    const initialDropdowns = service.dropdown();
    expect(initialDropdowns.result).toBe(false);
    expect(initialDropdowns.profile).toBe(false);
    expect(initialDropdowns.notifications).toBe(false);
  });

  it('should show result dropdown', () => {
    service.showDropdown('result');
    const dropdowns = service.dropdown();
    expect(dropdowns.result).toBe(true);
    expect(dropdowns.profile).toBe(false);
    expect(dropdowns.notifications).toBe(false);
  });

  it('should show profile dropdown', () => {
    service.showDropdown('profile');
    const dropdowns = service.dropdown();
    expect(dropdowns.result).toBe(false);
    expect(dropdowns.profile).toBe(true);
    expect(dropdowns.notifications).toBe(false);
  });

  it('should show notifications dropdown', () => {
    service.showDropdown('notifications');
    const dropdowns = service.dropdown();
    expect(dropdowns.result).toBe(false);
    expect(dropdowns.profile).toBe(false);
    expect(dropdowns.notifications).toBe(true);
  });

  it('should update only the specified dropdown and preserve others', () => {
    // First show result
    service.showDropdown('result');
    let dropdowns = service.dropdown();
    expect(dropdowns.result).toBe(true);
    expect(dropdowns.profile).toBe(false);
    expect(dropdowns.notifications).toBe(false);

    // Then show profile without affecting result
    service.showDropdown('profile');
    dropdowns = service.dropdown();
    expect(dropdowns.result).toBe(true);
    expect(dropdowns.profile).toBe(true);
    expect(dropdowns.notifications).toBe(false);

    // Finally show notifications without affecting the previous ones
    service.showDropdown('notifications');
    dropdowns = service.dropdown();
    expect(dropdowns.result).toBe(true);
    expect(dropdowns.profile).toBe(true);
    expect(dropdowns.notifications).toBe(true);
  });
});
