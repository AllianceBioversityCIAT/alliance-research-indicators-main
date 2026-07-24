import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';
import { ProjectPlatformFiltersComponent } from './project-platform-filters.component';

describe('ProjectPlatformFiltersComponent', () => {
  let component: ProjectPlatformFiltersComponent;
  let fixture: ComponentFixture<ProjectPlatformFiltersComponent>;
  let resultsCenterService: { tableFilters: ReturnType<typeof signal<{ sources: { platform_code: string }[] }>> };

  beforeEach(async () => {
    resultsCenterService = {
      tableFilters: signal({ sources: [{ platform_code: 'STAR' }] })
    };

    await TestBed.configureTestingModule({
      imports: [ProjectPlatformFiltersComponent],
      providers: [{ provide: ResultsCenterService, useValue: resultsCenterService }]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectPlatformFiltersComponent);
    component = fixture.componentInstance;
  });

  it('should expose all platform options', () => {
    expect(component.platformOptions).toHaveLength(4);
    expect(component.platformOptions.map(option => option.platform_code)).toEqual(['AICCRA', 'STAR', 'PRMS', 'TIP']);
  });

  it('should return an empty filtered platform set when filtering is disabled', () => {
    component.enableFilter = false;

    expect(component.filteredPlatformCodes()).toEqual(new Set());
  });

  it('should emit platform clicks when filtering is enabled', () => {
    const event = createEvent();
    const emitSpy = jest.spyOn(component.platformClick, 'emit');
    component.enableFilter = true;

    component.onPlatformClick({ platform_code: 'STAR', name: 'STAR' }, event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith({ platform_code: 'STAR', name: 'STAR' });
  });

  it('should ignore platform clicks when filtering is disabled', () => {
    const event = createEvent();
    const emitSpy = jest.spyOn(component.platformClick, 'emit');

    component.onPlatformClick({ platform_code: 'STAR', name: 'STAR' }, event);

    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should detect filtered platforms only when filtering is enabled', () => {
    component.enableFilter = false;
    expect(component.isPlatformFiltered({ platform_code: 'STAR', name: 'STAR' })).toBe(false);

    component.enableFilter = true;
    expect(component.isPlatformFiltered({ platform_code: 'STAR', name: 'STAR' })).toBe(true);
    expect(component.isPlatformFiltered({ platform_code: 'TIP', name: 'TIP' })).toBe(false);
  });

  it('should treat missing sources as an empty filtered platform set', () => {
    resultsCenterService.tableFilters.set({ sources: undefined as unknown as { platform_code: string }[] });
    component.enableFilter = true;

    expect(component.filteredPlatformCodes()).toEqual(new Set());
  });

  it('should return an empty filtered platform set when results center service is unavailable', () => {
    (component as any).resultsCenterService = null;
    component.enableFilter = true;

    expect(component.filteredPlatformCodes()).toEqual(new Set());
    expect(component.isPlatformFiltered({ platform_code: 'STAR', name: 'STAR' })).toBe(false);
  });

  it('should return platform colors from the color map', () => {
    expect(component.getPlatformColors('STAR')).toEqual({ text: '#1689CA', background: '#E6F2FF' });
    expect(component.getPlatformColors('UNKNOWN')).toBeUndefined();
  });
});

function createEvent(): Event {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn()
  } as unknown as Event;
}
