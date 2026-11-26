import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubmissionService } from '@shared/services/submission.service';
import { ActionsService } from '@shared/services/actions.service';
import { CacheService } from '@shared/services/cache/cache.service';
import { OicrAnnexItemComponent, OicrAnnexItemData } from './oicr-annex-item.component';
import { actionsServiceMock, cacheServiceMock, submissionServiceMock } from 'src/app/testing/mock-services.mock';

describe('OicrAnnexItemComponent', () => {
  let fixture: ComponentFixture<OicrAnnexItemComponent>;
  let component: OicrAnnexItemComponent;
  let editable: jest.Mock;

  const blank = (): OicrAnnexItemData => ({ annex_type_id: null, description: '', photo_credits: null, file_type: null, partner_consent: null, link: '' });
  const el = (): HTMLElement => fixture.nativeElement;
  const labels = () => Array.from(el().querySelectorAll('h2.label')).map(h => h.textContent?.replace('*', '').trim());

  beforeEach(async () => {
    editable = jest.fn().mockReturnValue(true);
    await TestBed.configureTestingModule({
      imports: [OicrAnnexItemComponent],
      providers: [
        { provide: SubmissionService, useValue: { ...submissionServiceMock, isEditableStatus: editable } },
        { provide: ActionsService, useValue: { ...actionsServiceMock, saveCurrentSection: jest.fn() } },
        { provide: CacheService, useValue: { ...cacheServiceMock, currentResultIsLoading: () => false } }
      ]
    }).compileComponents();
    fixture = TestBed.createComponent(OicrAnnexItemComponent);
    component = fixture.componentInstance;
  });

  const render = (item: OicrAnnexItemData) => {
    component.item = item;
    fixture.detectChanges();
  };

  describe('initial state (no type chosen)', () => {
    beforeEach(() => render(blank()));

    it('shows the annex number, the type question and no field row', () => {
      component.itemNumber = 3;
      fixture.detectChanges();
      expect(el().textContent).toContain('ANNEX # 3');
      expect(labels()).toEqual(['Annex type']);
      expect(el().querySelector('[data-testid="annex-type-required"]')).not.toBeNull();
      expect(el().querySelectorAll('app-input').length).toBe(0);
    });

    it('offers the three fixed types', () => {
      expect(Array.from(el().querySelectorAll('label.option-label')).map(l => l.textContent?.trim())).toEqual([
        'Photos',
        'Maps, figures, tables, and graphs',
        "Partners' logos"
      ]);
    });

    it('transitions to Photos: text second field with its labels and placeholders', () => {
      component.onTypeChange(1);
      fixture.detectChanges();
      expect(labels()).toEqual(['Annex type', 'Description', 'Photo credits', 'Links to the photo']);
      const placeholders = Array.from(el().querySelectorAll('input[pinputtext]')).map(i => i.getAttribute('placeholder'));
      expect(placeholders).toEqual(['Describe the item here', 'Enter the individual(s) to be credited', 'Paste the link to the folder']);
      expect(el().querySelector('p-select')).toBeNull();
      expect(el().querySelector('[data-testid="annex-type-required"]')).toBeNull();
    });

    it('transitions to Maps: select second field', () => {
      component.onTypeChange(2);
      fixture.detectChanges();
      expect(labels()).toEqual(['Annex type', 'Description', 'Type of file', 'Link to the file']);
      expect(el().querySelector('p-select')).not.toBeNull();
      expect(component.kind?.field2.options).toEqual(['Map', 'Figure', 'Table', 'Graph']);
    });

    it('transitions to Partners: select second field with consent options', () => {
      component.onTypeChange(3);
      fixture.detectChanges();
      expect(labels()).toEqual(['Annex type', 'Partners', "Partner's consent secured?", 'Links to logo and consent']);
      expect(component.kind?.field2.options).toEqual(['Yes', 'No', 'Not applicable']);
      const placeholders = Array.from(el().querySelectorAll('input[pinputtext]')).map(i => i.getAttribute('placeholder'));
      expect(placeholders[0]).toBe("Enter the Partner's name");
    });

    it('shows required messages for the empty fields once a type is chosen', () => {
      component.onTypeChange(2);
      fixture.detectChanges();
      expect(el().querySelector('[data-testid="annex-field2-required"]')).not.toBeNull();
      const messages = Array.from(el().querySelectorAll('span')).filter(s => s.textContent?.trim() === 'This field is required');
      expect(messages.length).toBeGreaterThanOrEqual(3);
    });

    it('does not emit update just for initializing', () => {
      const spy = jest.spyOn(component.update, 'emit');
      fixture.detectChanges();
      expect(spy).not.toHaveBeenCalled();
    });
  });

  describe('type change', () => {
    it('clears the second field and swaps text to select', () => {
      render({ ...blank(), id: 5, annex_type_id: 1, description: 'd', photo_credits: 'Jane', link: 'https://a.org' });
      expect(el().querySelector('p-select')).toBeNull();
      component.onTypeChange(2);
      fixture.detectChanges();
      expect(component.body().photo_credits).toBeNull();
      expect(component.body().file_type).toBeNull();
      expect(component.body().description).toBe('d');
      expect(component.body().id).toBe(5);
      expect(el().querySelector('p-select')).not.toBeNull();
    });

    it('clears the selected value and swaps select back to text', () => {
      render({ ...blank(), annex_type_id: 2, description: 'd', file_type: 'Map', link: 'https://a.org' });
      expect(component.selectValue).toBe('Map');
      component.onTypeChange(1);
      fixture.detectChanges();
      expect(component.body().file_type).toBeNull();
      expect(component.selectValue).toBeNull();
      expect(el().querySelector('p-select')).toBeNull();
    });

    it('clears between two select types', () => {
      render({ ...blank(), annex_type_id: 2, file_type: 'Table' });
      component.onTypeChange(3);
      expect(component.body().file_type).toBeNull();
      expect(component.body().partner_consent).toBeNull();
    });

    it('stores the select choice in the field that belongs to the type', () => {
      render({ ...blank(), annex_type_id: 3 });
      component.onSelectChange('Yes');
      expect(component.body().partner_consent).toBe('Yes');
      expect(component.body().file_type).toBeNull();
    });

    it('ignores a select change while no type is chosen', () => {
      render(blank());
      component.onSelectChange('Yes');
      expect(component.body()).toEqual(blank());
    });
  });

  describe('URL validation', () => {
    it('shows the invalid URL message for a bad link and none for a good one', () => {
      render({ ...blank(), annex_type_id: 1, description: 'd', photo_credits: 'p', link: 'not a url' });
      expect(el().textContent).toContain('Please enter a valid URL');
      component.body.update(b => ({ ...b, link: 'https://sharepoint.com/folder' }));
      fixture.detectChanges();
      expect(el().textContent).not.toContain('Please enter a valid URL');
    });
  });

  describe('emit and delete', () => {
    it('emits the new body after initialization', () => {
      render(blank());
      const spy = jest.spyOn(component.update, 'emit');
      component.onTypeChange(1);
      fixture.detectChanges();
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({ annex_type_id: 1 }));
    });

    it('syncs the body when the parent passes another item', () => {
      render(blank());
      const next = { ...blank(), annex_type_id: 3, description: 'ILRI' };
      component.item = next;
      component.ngOnChanges({ item: { currentValue: next, previousValue: blank(), firstChange: false, isFirstChange: () => false } });
      expect(component.body()).toEqual(next);
    });

    it('emits delete when editable and not otherwise', () => {
      render(blank());
      const spy = jest.spyOn(component.delete, 'emit');
      component.onDelete();
      expect(spy).toHaveBeenCalledTimes(1);
      editable.mockReturnValue(false);
      component.onDelete();
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('hides the remove button when not editable', () => {
      editable.mockReturnValue(false);
      render(blank());
      expect(el().querySelector('[data-testid="annex-delete"]')).toBeNull();
    });
  });
});
