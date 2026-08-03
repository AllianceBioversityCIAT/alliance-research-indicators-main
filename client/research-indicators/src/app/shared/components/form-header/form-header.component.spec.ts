import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { FormHeaderComponent } from './form-header.component';
import { CacheService } from '@shared/services/cache/cache.service';
import { DateFormatConfigService } from '@shared/services/date-format-config.service';

describe('FormHeaderComponent', () => {
  let component: FormHeaderComponent;
  let fixture: ComponentFixture<FormHeaderComponent>;

  let currentMetadataSignal: ReturnType<typeof signal>;
  let isExternalResultSignal: ReturnType<typeof signal<boolean>>;

  const dateFormatConfigMock = {
    config: signal({ format: 'dd/MM/yyyy' })
  };

  beforeEach(async () => {
    currentMetadataSignal = signal<any>({ result_title: '' });
    isExternalResultSignal = signal(false);

    const cacheServiceMock = {
      currentMetadata: currentMetadataSignal,
      showSectionHeaderActions: signal(false),
      isExternalResult: isExternalResultSignal
    } as unknown as CacheService;

    await TestBed.configureTestingModule({
      imports: [FormHeaderComponent],
      providers: [
        { provide: CacheService, useValue: cacheServiceMock },
        { provide: DateFormatConfigService, useValue: dateFormatConfigMock }
      ]
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

  describe('external result header block (R-RC-008/009/010)', () => {
    const externalMetadata = {
      result_title: 'External result',
      platform_code: 'TIP',
      public_link: 'https://public.example/link',
      external_link: 'https://tip.example/result/1',
      updated_at: '2026-07-20T10:00:00Z'
    };

    it('renders synced date, public link action, and deep-link action when external result has all three fields', () => {
      isExternalResultSignal.set(true);
      currentMetadataSignal.set(externalMetadata);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      const text = compiled.textContent ?? '';

      expect(text).toContain('Last synced:');
      expect(text).toContain('Open public link');
      expect(text).toContain('Open link to result');

      const buttons = Array.from(compiled.querySelectorAll('button'));
      expect(buttons.some(b => b.textContent?.includes('Open public link'))).toBe(true);
      expect(buttons.some(b => b.textContent?.includes('Open link to result'))).toBe(true);
    });

    it('renders none of the 3 elements for a STAR (non-external) result', () => {
      isExternalResultSignal.set(false);
      currentMetadataSignal.set(externalMetadata);
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      const text = compiled.textContent ?? '';

      expect(text).not.toContain('Last synced:');
      expect(text).not.toContain('Open public link');
      expect(text).not.toContain('Open link to result');
      expect(text).not.toContain('Open result in MARLO');
      expect(text).not.toContain('Open result in PRMS');
    });

    it('omits the "Open public link" action when public_link is absent, keeps the other two', () => {
      isExternalResultSignal.set(true);
      currentMetadataSignal.set({ ...externalMetadata, public_link: undefined });
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      const text = compiled.textContent ?? '';

      expect(text).not.toContain('Open public link');
      expect(text).toContain('Last synced:');
      expect(text).toContain('Open link to result');
    });

    it('omits the deep-link action when external_link is absent, keeps the other two', () => {
      isExternalResultSignal.set(true);
      currentMetadataSignal.set({ ...externalMetadata, external_link: undefined });
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      const text = compiled.textContent ?? '';

      expect(text).toContain('Last synced:');
      expect(text).toContain('Open public link');
      expect(text).not.toContain('Open link to result');
      expect(text).not.toContain('Open result in MARLO');
      expect(text).not.toContain('Open result in PRMS');
    });

    it('omits the synced-date element when updated_at is absent, with no "Invalid Date" text anywhere, and keeps the other two', () => {
      isExternalResultSignal.set(true);
      currentMetadataSignal.set({ ...externalMetadata, updated_at: undefined });
      fixture.detectChanges();

      const compiled: HTMLElement = fixture.nativeElement;
      const text = compiled.textContent ?? '';

      expect(text).not.toContain('Last synced:');
      expect(text).not.toContain('Invalid Date');
      expect(text).toContain('Open public link');
      expect(text).toContain('Open link to result');
    });

    it('uses platform-specific copy for AICCRA and PRMS deep links', () => {
      isExternalResultSignal.set(true);

      currentMetadataSignal.set({ ...externalMetadata, platform_code: 'AICCRA' });
      fixture.detectChanges();
      expect(component.externalLinkLabel()).toBe('Open result in MARLO');

      currentMetadataSignal.set({ ...externalMetadata, platform_code: 'PRMS' });
      fixture.detectChanges();
      expect(component.externalLinkLabel()).toBe('Open result in PRMS');
    });

    it('openPublicLink() opens the public link in a new tab', () => {
      isExternalResultSignal.set(true);
      currentMetadataSignal.set(externalMetadata);
      fixture.detectChanges();

      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openPublicLink();

      expect(openSpy).toHaveBeenCalledWith(externalMetadata.public_link, '_blank', 'noopener');
      openSpy.mockRestore();
    });

    it('openExternalLink() opens the external link in a new tab for a supported platform', () => {
      isExternalResultSignal.set(true);
      currentMetadataSignal.set(externalMetadata);
      fixture.detectChanges();

      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openExternalLink();

      expect(openSpy).toHaveBeenCalledWith(externalMetadata.external_link, '_blank', 'noopener');
      openSpy.mockRestore();
    });

    it('openExternalLink() does nothing when external_link is absent', () => {
      isExternalResultSignal.set(true);
      currentMetadataSignal.set({ ...externalMetadata, external_link: undefined });
      fixture.detectChanges();

      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openExternalLink();

      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });

    it('openPublicLink() does nothing when public_link is absent', () => {
      isExternalResultSignal.set(true);
      currentMetadataSignal.set({ ...externalMetadata, public_link: undefined });
      fixture.detectChanges();

      const openSpy = jest.spyOn(globalThis, 'open').mockImplementation(() => null);
      component.openPublicLink();

      expect(openSpy).not.toHaveBeenCalled();
      openSpy.mockRestore();
    });
  });
});
