import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CacheService } from '@shared/services/cache/cache.service';
import { UtilsService } from '@shared/services/utils.service';
import { WordCountService } from '@shared/services/word-count.service';
import { cacheServiceMock } from 'src/app/testing/mock-services.mock';
import { VariableConfigurationJsonRowComponent } from './variable-configuration-json-row.component';
import { AppConfigListItem } from '@shared/interfaces/app-config.interface';
import { buildJsonEditorTree, flattenJsonLeaves } from '@shared/utils/json-structure-editor.util';

describe('VariableConfigurationJsonRowComponent', () => {
  const jsonValue = { meta: { enabled: true }, locale: 'en-US' };
  const row: AppConfigListItem = {
    key: 'json.key',
    category: 'UI',
    subcategory: null,
    description: null,
    simple_value: null,
    json_value: jsonValue,
    updated_at: '2024-01-01',
    updated_by: 'user'
  };
  const sections = buildJsonEditorTree(jsonValue);
  const values = flattenJsonLeaves(jsonValue);

  let fixture: ComponentFixture<VariableConfigurationJsonRowComponent>;
  let component: VariableConfigurationJsonRowComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VariableConfigurationJsonRowComponent, HttpClientTestingModule],
      providers: [
        { provide: CacheService, useValue: cacheServiceMock },
        {
          provide: UtilsService,
          useValue: { getNestedProperty: jest.fn(), setNestedPropertyWithReduceSignal: jest.fn() }
        },
        { provide: WordCountService, useValue: { getWordCount: jest.fn().mockReturnValue(0) } }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VariableConfigurationJsonRowComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('row', row);
    fixture.componentRef.setInput('sections', sections);
    fixture.componentRef.setInput('values', values);
    fixture.componentRef.setInput('expandedSections', { meta: true });
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('isSectionExpanded should read expansion map', () => {
    expect(component.isSectionExpanded('meta')).toBe(true);
    expect(component.isSectionExpanded('missing')).toBe(false);
  });

  it('should group accordions together and render leaves in a separate editor block', () => {
    const groupSections = sections.filter(section => section.type === 'group');
    const leafSections = sections.filter(section => section.type === 'leaf');
    expect(groupSections.length).toBeGreaterThan(0);
    expect(leafSections.length).toBeGreaterThan(0);
    expect(component.groupSections().length).toBe(groupSections.length);
    expect(component.leafSections().length).toBe(leafSections.length);
    expect(fixture.nativeElement.querySelectorAll('app-json-structure-editor').length).toBe(2);
  });

  it('should propagate fieldChange from nested json editor', () => {
    const events: unknown[] = [];
    component.fieldChange.subscribe(e => events.push(e));
    component.fieldChange.emit({ pathKey: 'locale', value: 'fr-FR' });
    expect(events).toEqual([{ pathKey: 'locale', value: 'fr-FR' }]);
  });

  it('sectionToggle and save outputs should emit', () => {
    const toggles: string[] = [];
    const saves: unknown[] = [];
    component.sectionToggle.subscribe(key => toggles.push(key));
    component.save.subscribe(() => saves.push(true));
    component.sectionToggle.emit('meta');
    component.save.emit();
    expect(toggles).toEqual(['meta']);
    expect(saves).toEqual([true]);
  });
});
