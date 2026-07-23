import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { CacheService } from '@shared/services/cache/cache.service';
import { UtilsService } from '@shared/services/utils.service';
import { WordCountService } from '@shared/services/word-count.service';
import { cacheServiceMock } from 'src/app/testing/mock-services.mock';
import { JsonStructureEditorComponent } from './json-structure-editor.component';
import {
  buildJsonEditorTree,
  flattenJsonLeaves
} from '@shared/utils/json-structure-editor.util';

describe('JsonStructureEditorComponent', () => {
  const template = {
    label: 'hello',
    count: 2,
    flag: false,
    nullable: null as null,
    date: { enabled: true, order: 'DMY' }
  };

  const values = flattenJsonLeaves(template);
  const nodes = buildJsonEditorTree(template);

  let fixture: ComponentFixture<JsonStructureEditorComponent>;
  let component: JsonStructureEditorComponent;
  let emitted: { pathKey: string; value: unknown }[];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JsonStructureEditorComponent, HttpClientTestingModule],
      providers: [
        { provide: CacheService, useValue: cacheServiceMock },
        {
          provide: UtilsService,
          useValue: { getNestedProperty: jest.fn(), setNestedPropertyWithReduceSignal: jest.fn() }
        },
        { provide: WordCountService, useValue: { getWordCount: jest.fn().mockReturnValue(0) } }
      ]
    }).compileComponents();

    emitted = [];
    fixture = TestBed.createComponent(JsonStructureEditorComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('nodes', nodes);
    fixture.componentRef.setInput('values', values);
    component.fieldChange.subscribe(event => emitted.push(event));
    fixture.detectChanges();
    TestBed.flushEffects();
  });

  it('should create and partition leaf nodes', () => {
    expect(component).toBeTruthy();
    expect(component.leafNodes().length).toBeGreaterThan(0);
    expect(component.booleanLeafNodes().some(n => n.key === 'flag')).toBe(true);
    expect(component.nonBooleanLeafNodes().some(n => n.key === 'label')).toBe(true);
  });

  it('fieldBody should expose normalized values', () => {
    const body = component.fieldBody('count', 'number');
    expect(body().value).toBe(2);
  });

  it('fieldValue should default missing keys to empty string', () => {
    expect(component.fieldValue('missing')).toBe('');
  });

  it('asBoolean should read boolean leaves', () => {
    expect(component.asBoolean('flag')).toBe(false);
  });

  it('onBooleanChange should emit fieldChange', () => {
    component.onBooleanChange('flag', true);
    expect(emitted).toContainEqual({ pathKey: 'flag', value: true });
  });

  it('should emit when form value diverges from parent', () => {
    emitted.length = 0;
    component.fieldBody('label', 'string').set({ value: 'edited' });
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(emitted.some(e => e.pathKey === 'label' && e.value === 'edited')).toBe(true);
  });

  it('should coerce invalid number input to zero on emit', () => {
    emitted.length = 0;
    component.fieldBody('count', 'number').set({ value: 'bad' });
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(emitted.some(e => e.pathKey === 'count' && e.value === 0)).toBe(true);
  });

  it('should clear lastEmitted and stop emitting when parent catches up', () => {
    emitted.length = 0;
    component.fieldBody('label', 'string').set({ value: 'synced' });
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(emitted.some(e => e.pathKey === 'label' && e.value === 'synced')).toBe(true);
    emitted.length = 0;
    fixture.componentRef.setInput('values', { ...values, label: 'synced' });
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(emitted.filter(e => e.pathKey === 'label').length).toBe(0);
  });

  it('should render nested groups when depth increases', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('h3')).toBeTruthy();
  });

  it('should cover normalization and coercion edge cases', () => {
    const internal = component as unknown as {
      normalizeFromParent: (v: unknown, t: string) => unknown;
      coerceEmitValue: (v: unknown, t: string) => unknown;
      leafValuesEqual: (a: unknown, b: unknown, t: string) => boolean;
    };
    expect(internal.normalizeFromParent(undefined, 'null')).toBe('null');
    expect(internal.normalizeFromParent('3', 'number')).toBe(3);
    expect(internal.normalizeFromParent(3, 'number')).toBe(3);
    expect(internal.normalizeFromParent('', 'number')).toBeNull();
    expect(internal.normalizeFromParent(null, 'number')).toBeNull();
    expect(internal.normalizeFromParent('bad', 'number')).toBeNull();
    expect(internal.coerceEmitValue('bad', 'number')).toBe(0);
    expect(internal.coerceEmitValue('', 'number')).toBe(0);
    expect(internal.coerceEmitValue(null, 'number')).toBe(0);
    expect(internal.coerceEmitValue(4, 'number')).toBe(4);
    expect(internal.coerceEmitValue(true, 'boolean')).toBe(true);
    expect(internal.coerceEmitValue(false, 'boolean')).toBe(false);
    expect(internal.coerceEmitValue(null, 'string')).toBe('');
    expect(internal.coerceEmitValue(undefined, 'string')).toBe('');
    expect(internal.coerceEmitValue('hello', 'string')).toBe('hello');
    expect(internal.coerceEmitValue('8', 'number')).toBe(8);
    expect(internal.normalizeFromParent(null, 'string')).toBe('');
    expect(internal.normalizeFromParent(undefined, 'string')).toBe('');
    expect(internal.normalizeFromParent('hello', 'string')).toBe('hello');
    expect(internal.normalizeFromParent(false, 'boolean')).toBe(false);
    expect(internal.normalizeFromParent(true, 'boolean')).toBe(true);
    expect(internal.leafValuesEqual('a', 'a', 'string')).toBe(true);
  });

  it('should skip duplicate emissions when lastEmitted matches coerced value', () => {
    const internal = component as unknown as { lastEmitted: Map<string, unknown> };
    internal.lastEmitted.set('label', 'once');
    emitted.length = 0;
    component.fieldBody('label', 'string').set({ value: 'once' });
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(emitted.filter(e => e.pathKey === 'label').length).toBe(0);
  });

  it('should delete lastEmitted when form matches parent', () => {
    const internal = component as unknown as { lastEmitted: Map<string, unknown> };
    internal.lastEmitted.set('label', 'stale');
    fixture.componentRef.setInput('values', { ...values, label: 'hello' });
    component.fieldBody('label', 'string').set({ value: 'hello' });
    fixture.detectChanges();
    TestBed.flushEffects();
    expect(internal.lastEmitted.has('label')).toBe(false);
  });
});
