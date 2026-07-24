import { Injectable, signal, WritableSignal } from '@angular/core';
import { DropdownName } from '@ts-types/dropdown.types';

@Injectable({
  providedIn: 'root'
})
export class DropdownsCacheService {
  dropdown: WritableSignal<Record<DropdownName, boolean>> = signal({
    result: false,
    profile: false,
    notifications: false
  });

  showDropdown(dropdownName: DropdownName) {
    this.dropdown.update(dropdowns => ({
      ...dropdowns,
      [dropdownName]: true
    }));
  }
}
