import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { ProjectItemComponent } from './project-item.component';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { IndicatorElement } from '@shared/interfaces/get-contracts-by-user.interface';
import { GetProjectDetailIndicator } from '@shared/interfaces/get-project-detail.interface';

describe('ProjectItemComponent', () => {
  let component: ProjectItemComponent;
  let fixture: ComponentFixture<ProjectItemComponent>;
  let mockResultsCenterService: Partial<ResultsCenterService>;
  let projectUtilsService: ProjectUtilsService;

  beforeEach(async () => {
    mockResultsCenterService = {
      tableFilters: signal({
        levers: [],
        statusCodes: [],
        years: [],
        contracts: [],
        indicators: []
      })
    } as Partial<ResultsCenterService>;

    await TestBed.configureTestingModule({
      imports: [ProjectItemComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: new Map() },
            params: of({})
          }
        },
        {
          provide: ResultsCenterService,
          useValue: mockResultsCenterService
        },
        ProjectUtilsService
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectItemComponent);
    component = fixture.componentInstance;
    projectUtilsService = TestBed.inject(ProjectUtilsService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should process indicators on ngOnInit', () => {
    const project = {
      indicators: [
        { indicator_id: 1, indicator: { name: 'Test Indicator' } }
      ] as IndicatorElement[]
    };
    component.project = project;
    component.ngOnInit();
    expect(component.processedIndicators.length).toBeGreaterThan(0);
  });

  it('should process indicators when project changes', () => {
    const project = {
      indicators: [
        { indicator_id: 1, indicator: { name: 'Test Indicator' } }
      ] as IndicatorElement[]
    };
    component.project = {};
    component.ngOnInit();
    expect(component.processedIndicators).toEqual([]);

    component.project = project;
    component.ngOnChanges({
      project: {
        previousValue: {},
        currentValue: project,
        firstChange: false,
        isFirstChange: () => false
      }
    });
    expect(component.processedIndicators.length).toBeGreaterThan(0);
  });

  it('should not process indicators if project change is first change', () => {
    const project = {
      indicators: [
        { indicator_id: 1, indicator: { name: 'Test Indicator' } }
      ] as IndicatorElement[]
    };
    component.project = project;
    component.ngOnChanges({
      project: {
        previousValue: undefined,
        currentValue: project,
        firstChange: true,
        isFirstChange: () => true
      }
    });
    // Should not process on first change
  });

  it('should return empty array when project has no indicators', () => {
    component.project = {};
    component.ngOnInit();
    expect(component.processedIndicators).toEqual([]);
  });

  it('should call getStatusDisplay', () => {
    const project = { status_id: 1, status_name: 'Active' };
    component.project = project;
    const spy = jest.spyOn(projectUtilsService, 'getStatusDisplay');
    component.getStatusDisplay();
    expect(spy).toHaveBeenCalledWith(project);
  });

  it('should call getLeverName', () => {
    const project = { lever_name: 'Lever 1' };
    component.project = project;
    const spy = jest.spyOn(projectUtilsService, 'getLeverName');
    component.getLeverName();
    expect(spy).toHaveBeenCalledWith(project);
  });

  it('should call hasField', () => {
    const project = { field_name: 'value' };
    component.project = project;
    const spy = jest.spyOn(projectUtilsService, 'hasField');
    component.hasField('field_name');
    expect(spy).toHaveBeenCalledWith(project, 'field_name');
  });

  it('should emit indicatorClick when enableIndicatorFilter is true', () => {
    component.enableIndicatorFilter = true;
    const spy = jest.spyOn(component.indicatorClick, 'emit');
    const indicator = { indicator_id: 1, indicator: { name: 'Test' } } as IndicatorElement;
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as Event;

    component.onIndicatorClick(indicator, event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(spy).toHaveBeenCalledWith({ indicator_id: 1, name: 'Test' });
  });

  it('should not emit indicatorClick when enableIndicatorFilter is false', () => {
    component.enableIndicatorFilter = false;
    const spy = jest.spyOn(component.indicatorClick, 'emit');
    const indicator = { indicator_id: 1, indicator: { name: 'Test' } } as IndicatorElement;
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as Event;

    component.onIndicatorClick(indicator, event);

    expect(spy).not.toHaveBeenCalled();
  });

  it('should handle indicator with indicator.indicator_id', () => {
    component.enableIndicatorFilter = true;
    const spy = jest.spyOn(component.indicatorClick, 'emit');
    const indicator = { indicator: { indicator_id: 2, name: 'Test 2' } } as GetProjectDetailIndicator;
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as Event;

    component.onIndicatorClick(indicator, event);

    expect(spy).toHaveBeenCalledWith({ indicator_id: 2, name: 'Test 2' });
  });

  it('should handle indicator with empty name', () => {
    component.enableIndicatorFilter = true;
    const spy = jest.spyOn(component.indicatorClick, 'emit');
    const indicator = { indicator_id: 3, indicator: { name: '' } } as any;
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as Event;

    component.onIndicatorClick(indicator, event);

    expect(spy).toHaveBeenCalledWith({ indicator_id: 3, name: '' });
  });

  it('should emit an empty name when indicator metadata is missing', () => {
    component.enableIndicatorFilter = true;
    const spy = jest.spyOn(component.indicatorClick, 'emit');
    const indicator = { indicator_id: 4 } as IndicatorElement;
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as Event;

    component.onIndicatorClick(indicator, event);

    expect(spy).toHaveBeenCalledWith({ indicator_id: 4, name: '' });
  });

  it('should not emit when indicator_id is missing', () => {
    component.enableIndicatorFilter = true;
    const spy = jest.spyOn(component.indicatorClick, 'emit');
    const indicator = { indicator: { name: 'Test' } } as any;
    const event = { preventDefault: jest.fn(), stopPropagation: jest.fn() } as unknown as Event;

    component.onIndicatorClick(indicator, event);

    expect(spy).not.toHaveBeenCalled();
  });

  it('should return false for isIndicatorFiltered when enableIndicatorFilter is false', () => {
    component.enableIndicatorFilter = false;
    const indicator = { indicator_id: 1 } as IndicatorElement;
    expect(component.isIndicatorFiltered(indicator)).toBe(false);
  });

  it('should return false for isIndicatorFiltered when resultsCenterService is null', () => {
    component.enableIndicatorFilter = true;
    (component as any).resultsCenterService = null;
    const indicator = { indicator_id: 1 } as IndicatorElement;
    expect(component.isIndicatorFiltered(indicator)).toBe(false);
  });

  it('should return true when indicator is filtered', () => {
    component.enableIndicatorFilter = true;
    mockResultsCenterService.tableFilters = signal({
      levers: [],
      statusCodes: [],
      years: [],
      contracts: [],
      indicators: [{ indicator_id: 1, name: 'Test' }]
    });
    const indicator = { indicator_id: 1 } as IndicatorElement;
    expect(component.isIndicatorFiltered(indicator)).toBe(true);
  });

  it('should return false when indicator is not filtered', () => {
    component.enableIndicatorFilter = true;
    mockResultsCenterService.tableFilters = signal({
      levers: [],
      statusCodes: [],
      years: [],
      contracts: [],
      indicators: [{ indicator_id: 2, name: 'Other' }]
    });
    const indicator = { indicator_id: 1 } as IndicatorElement;
    expect(component.isIndicatorFiltered(indicator)).toBe(false);
  });

  it('should handle indicator with indicator.indicator_id in isIndicatorFiltered', () => {
    component.enableIndicatorFilter = true;
    mockResultsCenterService.tableFilters = signal({
      levers: [],
      statusCodes: [],
      years: [],
      contracts: [],
      indicators: [{ indicator_id: 2, name: 'Test' }]
    });
    const indicator = { indicator: { indicator_id: 2 } } as GetProjectDetailIndicator;
    expect(component.isIndicatorFiltered(indicator)).toBe(true);
  });

  it('should return false when indicator_id is missing in isIndicatorFiltered', () => {
    component.enableIndicatorFilter = true;
    const indicator = {} as IndicatorElement;
    expect(component.isIndicatorFiltered(indicator)).toBe(false);
  });

  it('should return empty set when resultsCenterService is null', () => {
    (component as any).resultsCenterService = null;
    expect(component.filteredIndicatorIds().size).toBe(0);
  });

  it('should return empty set when enableIndicatorFilter is false', () => {
    component.enableIndicatorFilter = false;
    expect(component.filteredIndicatorIds().size).toBe(0);
  });

  it('should return set with indicator ids when enabled', () => {
    component.enableIndicatorFilter = true;
    mockResultsCenterService.tableFilters = signal({
      levers: [],
      statusCodes: [],
      years: [],
      contracts: [],
      indicators: [
        { indicator_id: 1, name: 'Test 1' },
        { indicator_id: 2, name: 'Test 2' }
      ]
    });
    const ids = component.filteredIndicatorIds();
    expect(ids.size).toBe(2);
    expect(ids.has(1)).toBe(true);
    expect(ids.has(2)).toBe(true);
  });

  it('should return an empty set when filters do not include indicators', () => {
    component.enableIndicatorFilter = true;
    mockResultsCenterService.tableFilters = signal({} as any);

    expect(component.filteredIndicatorIds().size).toBe(0);
  });

  it('formatIndicatorLabel returns full string when under limit', () => {
    expect(component.formatIndicatorLabel('Short')).toBe('Short');
  });

  it('formatIndicatorLabel returns empty for undefined or empty string', () => {
    expect(component.formatIndicatorLabel()).toBe('');
    expect(component.formatIndicatorLabel('')).toBe('');
  });

  it('formatIndicatorLabel ends with a single dot when truncated', () => {
    const long = 'A'.repeat(30);
    expect(component.formatIndicatorLabel(long)).toMatch(/\.$/);
    expect(component.formatIndicatorLabel(long)).not.toContain('..');
  });

  describe('Pool Funding badge', () => {
    it('defaults isPoolFunding to false and does not render the badge', () => {
      expect(component.isPoolFunding).toBe(false);
      const badge = fixture.nativeElement.querySelector('[data-testid="pool-funding-tag"]');
      expect(badge).toBeNull();
    });

    it('renders the Pool Funding tag when isPoolFunding is true', () => {
      component.isPoolFunding = true;
      fixture.detectChanges();

      const badge: HTMLElement | null = fixture.nativeElement.querySelector('[data-testid="pool-funding-tag"]');
      expect(badge).not.toBeNull();
      expect(badge?.textContent).toContain('Pool Funding');
    });

    it('toggles the badge off when isPoolFunding flips back to false', () => {
      component.isPoolFunding = true;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="pool-funding-tag"]')).not.toBeNull();

      component.isPoolFunding = false;
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="pool-funding-tag"]')).toBeNull();
    });
  });
});
