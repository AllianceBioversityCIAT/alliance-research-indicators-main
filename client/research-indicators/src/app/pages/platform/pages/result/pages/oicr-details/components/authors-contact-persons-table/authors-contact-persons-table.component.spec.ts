import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthorsContactPersonsTableComponent } from './authors-contact-persons-table.component';
import { ContactPersonRow } from '@shared/interfaces/contact-person.interface';

describe('AuthorsContactPersonsTableComponent', () => {
  let component: AuthorsContactPersonsTableComponent;
  let fixture: ComponentFixture<AuthorsContactPersonsTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorsContactPersonsTableComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthorsContactPersonsTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Input properties', () => {
    it('should have default empty array for rows', () => {
      expect(component.rows).toEqual([]);
    });

    it('should accept rows input', () => {
      const mockRows: ContactPersonRow[] = [
        {
          id: 1,
          name: 'John Doe',
          position: 'Researcher',
          affiliation: 'University',
          email: 'john@example.com',
          role: 'Author'
        },
        {
          id: 2,
          name: 'Jane Smith',
          position: 'Professor',
          affiliation: 'College',
          email: 'jane@example.com',
          role: 'Contact Person'
        }
      ];

      component.rows = mockRows;
      fixture.detectChanges();

      expect(component.rows).toEqual(mockRows);
      expect(component.rows.length).toBe(2);
    });
  });

  describe('Output events', () => {
    it('should emit addClicked when add button is clicked', () => {
      jest.spyOn(component.addClicked, 'emit');

      const addButton = fixture.nativeElement.querySelector('p-button');
      addButton?.click();

      expect(component.addClicked.emit).toHaveBeenCalled();
    });

    it('should emit addClicked when add button is triggered with Enter key', () => {
      jest.spyOn(component.addClicked, 'emit');

      const addButton = fixture.nativeElement.querySelector('p-button');
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      addButton?.dispatchEvent(enterEvent);

      expect(component.addClicked.emit).toHaveBeenCalled();
    });

    it('should emit deleteClicked with row data when delete button is clicked', () => {
      const mockRow: ContactPersonRow = {
        id: 1,
        name: 'John Doe',
        position: 'Researcher',
        affiliation: 'University',
        email: 'john@example.com',
        role: 'Author'
      };

      component.rows = [mockRow];
      fixture.detectChanges();

      jest.spyOn(component.deleteClicked, 'emit');

      // Find the delete button in the table body
      const deleteButton = fixture.nativeElement.querySelector('tbody button[type="button"]');
      expect(deleteButton).toBeTruthy();
      deleteButton?.click();

      expect(component.deleteClicked.emit).toHaveBeenCalledWith(mockRow);
    });

    it('should emit deleteClicked when delete button is triggered with Enter key', () => {
      const mockRow: ContactPersonRow = {
        id: 1,
        name: 'John Doe',
        position: 'Researcher',
        affiliation: 'University',
        email: 'john@example.com',
        role: 'Author'
      };

      component.rows = [mockRow];
      fixture.detectChanges();

      jest.spyOn(component.deleteClicked, 'emit');

      // Find the delete button in the table body
      const deleteButton = fixture.nativeElement.querySelector('tbody button[type="button"]');
      expect(deleteButton).toBeTruthy();
      const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' });
      deleteButton?.dispatchEvent(enterEvent);

      expect(component.deleteClicked.emit).toHaveBeenCalledWith(mockRow);
    });
  });

  describe('Template rendering', () => {
    it('should display rows in table', () => {
      const mockRows: ContactPersonRow[] = [
        {
          id: 1,
          name: 'John Doe',
          position: 'Researcher',
          affiliation: 'University',
          email: 'john@example.com',
          role: 'Author'
        }
      ];

      component.rows = mockRows;
      fixture.detectChanges();

      const tableRows = fixture.nativeElement.querySelectorAll('tbody tr');
      expect(tableRows.length).toBe(1);
    });

    it('should display empty message when no rows', () => {
      component.rows = [];
      fixture.detectChanges();

      const emptyMessage = fixture.nativeElement.querySelector('td[colspan="7"]');
      expect(emptyMessage).toBeTruthy();
      expect(emptyMessage?.textContent).toContain('No people have been added yet');
    });

    it('should display row data correctly', () => {
      const mockRow: ContactPersonRow = {
        id: 1,
        name: 'John Doe',
        position: 'Researcher',
        affiliation: 'University',
        email: 'john@example.com',
        role: 'Author'
      };

      component.rows = [mockRow];
      fixture.detectChanges();

      const cells = fixture.nativeElement.querySelectorAll('tbody tr td');
      expect(cells[0].textContent.trim()).toBe('1'); // Row number
      expect(cells[1].textContent.trim()).toBe('John Doe');
      expect(cells[2].textContent.trim()).toBe('Researcher');
      expect(cells[3].textContent.trim()).toBe('University');
      expect(cells[4].textContent.trim()).toBe('john@example.com');
      expect(cells[5].textContent.trim()).toBe('Author');
    });

    it('should display dash for empty fields', () => {
      const mockRow: ContactPersonRow = {
        id: 1,
        name: '',
        position: null as any,
        affiliation: undefined as any,
        email: '',
        role: null as any
      };

      component.rows = [mockRow];
      fixture.detectChanges();

      const cells = fixture.nativeElement.querySelectorAll('tbody tr td');
      expect(cells[1].textContent.trim()).toBe('-');
      expect(cells[2].textContent.trim()).toBe('-');
      expect(cells[3].textContent.trim()).toBe('-');
      expect(cells[4].textContent.trim()).toBe('-');
      expect(cells[5].textContent.trim()).toBe('-');
    });
  });
});

