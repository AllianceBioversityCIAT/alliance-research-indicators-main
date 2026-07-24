import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormHeaderComponent } from './form-header.component';
import { CacheService } from '@shared/services/cache/cache.service';

describe('FormHeaderComponent', () => {
  let component: FormHeaderComponent;
  let fixture: ComponentFixture<FormHeaderComponent>;

  let currentMetadataSignal: ReturnType<typeof signal>;

  beforeEach(async () => {
    currentMetadataSignal = signal<any>({ result_title: '' });

    const cacheServiceMock = {
      currentMetadata: currentMetadataSignal,
      showSectionHeaderActions: signal(false)
    } as unknown as CacheService;

    await TestBed.configureTestingModule({
      imports: [FormHeaderComponent],
      providers: [{ provide: CacheService, useValue: cacheServiceMock }]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FormHeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('returns title as-is when under limits', () => {
    currentMetadataSignal.set({ result_title: 'Short title' });
    expect(component.sectionTitle()).toBe('Short title');
  });

  it('truncates when words length > 30 (keeps 30 words + ellipsis)', () => {
    const words = Array.from({ length: 35 }, (_, i) => `w${i + 1}`).join(' ');
    currentMetadataSignal.set({ result_title: words });
    const expected = Array.from({ length: 30 }, (_, i) => `w${i + 1}`).join(' ') + '...';
    expect(component.sectionTitle()).toBe(expected);
  });

  it('truncates when characters > 200 (first 200 chars + ellipsis)', () => {
    // Ensure words length <= 30 but chars > 200
    const base = 'word '.repeat(25).trim(); // <= 30 words
    const longTail = 'x'.repeat(210);
    const title = `${base} ${longTail}`;
    currentMetadataSignal.set({ result_title: title });
    const expected = title.slice(0, 200) + '...';
    expect(component.sectionTitle()).toBe(expected);
  });

  it('returns empty string when result_title is falsy (covers OR fallback)', () => {
    currentMetadataSignal.set({ result_title: undefined });
    expect(component.sectionTitle()).toBe('');
  });
});
