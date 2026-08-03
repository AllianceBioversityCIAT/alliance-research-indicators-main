import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ProjectUtilsService } from '@shared/services/project-utils.service';
import { ResultsCenterService } from '@pages/platform/pages/results-center/results-center.service';
import { ProjectIndicatorFiltersComponent } from './project-indicator-filters.component';

describe('ProjectIndicatorFiltersComponent', () => {
  let component: ProjectIndicatorFiltersComponent;
  let fixture: ComponentFixture<ProjectIndicatorFiltersComponent>;
  let projectUtilsService: { sortIndicators: jest.Mock };
  let resultsCenterService: { tableFilters: ReturnType<typeof signal<{ indicators: { indicator_id: number }[] }>> };

  beforeEach(async () => {
    projectUtilsService = {
      sortIndicators: jest.fn(indicators => indicators.toReversed())
    };
    resultsCenterService = {
      tableFilters: signal({ indicators: [{ indicator_id: 2 }] })
    };

    await TestBed.configureTestingModule({
      imports: [ProjectIndicatorFiltersComponent],
      providers: [
        { provide: ProjectUtilsService, useValue: projectUtilsService },
        { provide: ResultsCenterService, useValue: resultsCenterService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectIndicatorFiltersComponent);
    component = fixture.componentInstance;
  });

  it('should process indicators on init', () => {
    const firstIndicator = createIndicator(1, 'First indicator');
    const secondIndicator = createIndicator(2, 'Second indicator');
    component.project = { indicators: [firstIndicator, secondIndicator] };

    component.ngOnInit();

    expect(projectUtilsService.sortIndicators).toHaveBeenCalledWith([firstIndicator, secondIndicator]);
    expect(component.processedIndicators).toEqual([secondIndicator, firstIndicator]);
  });

  it('should reset processed indicators when the project has no indicators', () => {
    component.project = {};

    component.ngOnInit();

    expect(projectUtilsService.sortIndicators).not.toHaveBeenCalled();
    expect(component.processedIndicators).toEqual([]);
  });

  it('should process indicators when project changes after the first change', () => {
    const indicator = createIndicator(1, 'First indicator');
    component.project = { indicators: [indicator] };

    component.ngOnChanges({
      project: {
        currentValue: component.project,
        previousValue: {},
        firstChange: false,
        isFirstChange: () => false
      }
    });

    expect(component.processedIndicators).toEqual([indicator]);
  });

  it('should ignore first project changes', () => {
    component.project = { indicators: [createIndicator(1, 'First indicator')] };

    component.ngOnChanges({
      project: {
        currentValue: component.project,
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true
      }
    });

    expect(projectUtilsService.sortIndicators).not.toHaveBeenCalled();
    expect(component.processedIndicators).toEqual([]);
  });

  it('should return an empty filtered indicator set when filtering is disabled', () => {
    component.enableFilter = false;

    expect(component.filteredIndicatorIds()).toEqual(new Set());
  });

  it('should emit indicator clicks when filtering is enabled and the indicator has an id', () => {
    const event = createEvent();
    const emitSpy = jest.spyOn(component.indicatorClick, 'emit');
    component.enableFilter = true;

    component.onIndicatorClick(createIndicator(2, 'Second indicator'), event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(emitSpy).toHaveBeenCalledWith({ indicator_id: 2, name: 'Second indicator' });
  });

  it('should emit an empty indicator name when the indicator has an id but no nested name', () => {
    const event = createEvent();
    const emitSpy = jest.spyOn(component.indicatorClick, 'emit');
    component.enableFilter = true;

    component.onIndicatorClick({ indicator_id: 4, count_results: 1 }, event);

    expect(emitSpy).toHaveBeenCalledWith({ indicator_id: 4, name: '' });
  });

  it('should ignore indicator clicks when filtering is disabled or the indicator has no id', () => {
    const disabledEvent = createEvent();
    const noIdEvent = createEvent();
    const emitSpy = jest.spyOn(component.indicatorClick, 'emit');

    component.enableFilter = false;
    component.onIndicatorClick(createIndicator(2, 'Second indicator'), disabledEvent);
    component.enableFilter = true;
    component.onIndicatorClick({ indicator: { name: 'No id' }, count_results: 0 }, noIdEvent);

    expect(disabledEvent.preventDefault).not.toHaveBeenCalled();
    expect(noIdEvent.preventDefault).toHaveBeenCalled();
    expect(emitSpy).not.toHaveBeenCalled();
  });

  it('should detect filtered indicators only when filtering is enabled', () => {
    component.enableFilter = false;
    expect(component.isIndicatorFiltered(createIndicator(2, 'Second indicator'))).toBe(false);

    component.enableFilter = true;
    expect(component.isIndicatorFiltered(createIndicator(2, 'Second indicator'))).toBe(true);
    expect(component.isIndicatorFiltered(createIndicator(3, 'Third indicator'))).toBe(false);
    expect(component.isIndicatorFiltered({ indicator: { name: 'No id' }, count_results: 0 })).toBe(false);
  });

  it('should format indicator labels with empty, short and truncated values', () => {
    expect(component.formatIndicatorLabel()).toBe('');
    expect(component.formatIndicatorLabel('Short name')).toBe('Short name');
    expect(component.formatIndicatorLabel('Long indicator name')).toBe('Long indicator.');
  });
});

function createIndicator(indicatorId: number, name: string) {
  return {
    indicator_id: indicatorId,
    count_results: indicatorId,
    indicator: {
      indicator_id: indicatorId,
      name,
      icon_src: 'pi-users',
      indicator_type_id: 1
    }
  };
}

function createEvent(): Event {
  return {
    preventDefault: jest.fn(),
    stopPropagation: jest.fn()
  } as unknown as Event;
}
