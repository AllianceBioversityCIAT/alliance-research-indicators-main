import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { QuantificationItemComponent, QuantificationItemData } from './quantification-item.component';
import { SubmissionService } from '@shared/services/submission.service';
import { QuantificationUnitCategory } from '@shared/interfaces/oicr-catalogs.interface';

const CATALOG: QuantificationUnitCategory[] = [
  { id: 1, macro_category: 'Individuals', name: 'Farmers', is_percentage: false },
  { id: 2, macro_category: 'Individuals', name: 'Researchers', is_percentage: false },
  { id: 3, macro_category: 'Performance Metrics & Indicators', name: 'Adoption Rate', is_percentage: true },
  { id: 4, macro_category: 'Performance Metrics & Indicators', name: 'Yield', is_percentage: false }
];

describe('QuantificationItemComponent — OICR 2026 unit categories (opt-in)', () => {
  let fixture: ComponentFixture<QuantificationItemComponent>;
  let component: QuantificationItemComponent;

  const create = (data: QuantificationItemData, opts: Partial<QuantificationItemComponent> = {}) => {
    TestBed.configureTestingModule({
      imports: [QuantificationItemComponent, HttpClientTestingModule],
      providers: [{ provide: SubmissionService, useValue: { isEditableStatus: jest.fn().mockReturnValue(true) } }]
    });
    fixture = TestBed.createComponent(QuantificationItemComponent);
    component = fixture.componentInstance;
    component.quantification = data;
    Object.assign(component, opts);
    fixture.detectChanges();
  };

  afterEach(() => TestBed.resetTestingModule());

  const el = (): HTMLElement => fixture.nativeElement;

  it('default (Innovation Use / 2025): keeps the free-text Unit and shows no macro/category selects', () => {
    create({ number: null, unit: '', comments: '' });
    expect(el().querySelector('[data-testid="unit-macro"]')).toBeNull();
    expect(el().querySelector('[data-testid="open-unit-categories"]')).toBeNull();
    expect(el().querySelector('[data-testid="narrative-note"]')).toBeNull();
    expect(el().querySelector('[data-testid="percent-prefix"]')).toBeNull();
    expect(el().textContent).not.toContain('Suggested quantification categories');
  });

  it('opt-in: renders macro select, category select disabled until a macro is chosen', async () => {
    create({ number: null, unit: '', comments: '' }, { useUnitCategories: true, unitCategories: CATALOG });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(el().querySelector('[data-testid="unit-macro"]')).not.toBeNull();
    const category = el().querySelector('[data-testid="unit-category"]');
    expect(category).not.toBeNull();
    expect(category?.classList.contains('p-disabled')).toBe(true);
    expect(el().querySelector('[data-testid="unit-missing"]')?.textContent).toContain('This field is required');
  });

  it('lists each macro-category once, then Other', () => {
    create({ number: null, unit: '', comments: '' }, { useUnitCategories: true, unitCategories: CATALOG });
    expect(component.macroOptions()).toEqual(['Individuals', 'Performance Metrics & Indicators', 'Other']);
  });

  it('choosing a macro enables the category select with only its categories and clears the unit', async () => {
    create({ number: null, unit: 'stale', comments: '' }, { useUnitCategories: true, unitCategories: CATALOG });
    component.onMacroChange('Individuals');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(component.body().unit_macro_category).toBe('Individuals');
    expect(component.body().unit).toBe('');
    expect(component.categoryOptions().map(c => c.name)).toEqual(['Farmers', 'Researchers']);
    expect(el().querySelector('[data-testid="unit-category"]')?.classList.contains('p-disabled')).toBe(false);
    expect(el().querySelector('[data-testid="unit-missing"]')?.textContent).toContain('Please select a category');
  });

  it('choosing a category stores it in `unit` and emits the update', () => {
    create({ number: 3, unit: '', comments: 'c', unit_macro_category: 'Individuals' }, { useUnitCategories: true, unitCategories: CATALOG });
    const emitSpy = jest.spyOn(component.update, 'emit');
    component.onCategoryChange('Farmers');
    fixture.detectChanges();
    expect(component.body().unit).toBe('Farmers');
    expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ unit: 'Farmers', unit_macro_category: 'Individuals' }));
    expect(el().querySelector('[data-testid="unit-missing"]')).toBeNull();
  });

  it('macro Other swaps the category select for a free-text input', () => {
    create({ number: null, unit: '', comments: '' }, { useUnitCategories: true, unitCategories: CATALOG });
    component.onMacroChange('Other');
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.css('[data-testid="unit-category"]'))).toBeNull();
    expect(el().querySelector('input[placeholder="Specify the unit"]')).not.toBeNull();
    expect(el().querySelector('[data-testid="unit-missing"]')?.textContent).toContain('Please specify the unit');
  });

  it('shows the % prefix for a percentage category, and not for a regular one', () => {
    create({ number: 5, unit: 'Adoption Rate', comments: 'c', unit_macro_category: 'Performance Metrics & Indicators' }, { useUnitCategories: true, unitCategories: CATALOG });
    expect(component.isPercentageUnit()).toBe(true);
    expect(el().querySelector('[data-testid="percent-prefix"]')).not.toBeNull();

    component.onCategoryChange('Yield');
    fixture.detectChanges();
    expect(component.isPercentageUnit()).toBe(false);
    expect(el().querySelector('[data-testid="percent-prefix"]')).toBeNull();
  });

  it.each([
    ['% of farmers', true],
    ['adoption percent', true],
    ['uptake rate', true],
    ['market share', true],
    ['proportion of land', true],
    ['hectares', false]
  ])('Other text "%s" => percentage prefix %s', (text, expected) => {
    create({ number: 1, unit: text, comments: 'c', unit_macro_category: 'Other' }, { useUnitCategories: true, unitCategories: CATALOG });
    expect(component.isPercentageUnit()).toBe(expected);
  });

  it('never shows % when the opt-in is off, even if the unit text mentions percent', () => {
    create({ number: 1, unit: '% of farmers', comments: 'c', unit_macro_category: 'Other' });
    expect(component.isPercentageUnit()).toBe(false);
  });

  it('opens the suggested categories modal request on click', () => {
    create({ number: null, unit: '', comments: '' }, { useUnitCategories: true, unitCategories: CATALOG });
    const spy = jest.spyOn(component.openUnitCategories, 'emit');
    (el().querySelector('[data-testid="open-unit-categories"]') as HTMLButtonElement).click();
    expect(spy).toHaveBeenCalled();
  });

  it('shows the narrative note only when asked (Actual count rows)', () => {
    create({ number: null, unit: '', comments: '' }, { showNarrativeNote: true });
    expect(el().querySelector('[data-testid="narrative-note"]')?.textContent).toContain(
      'As you write it, this narrative is copied into "What outcome or impact was achieved?"'
    );
  });

  it('Comments stays required by default', () => {
    create({ number: null, unit: '', comments: '' }, { useUnitCategories: true, unitCategories: CATALOG });
    expect(component.commentsRequired).toBe(true);
    expect(el().querySelector('app-textarea .text-red-500, h2.label .text-\\[\\#CF0808\\]')).not.toBeNull();
  });
});
