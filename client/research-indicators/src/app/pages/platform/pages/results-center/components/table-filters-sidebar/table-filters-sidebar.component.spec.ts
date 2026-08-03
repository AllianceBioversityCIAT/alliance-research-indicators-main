import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TableFiltersSidebarComponent } from './table-filters-sidebar.component';
import { ResultsCenterService } from '../../results-center.service';

describe('TableFiltersSidebarComponent', () => {
  let component: TableFiltersSidebarComponent;
  let fixture: ComponentFixture<TableFiltersSidebarComponent>;
  let resultsCenterService: ResultsCenterService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableFiltersSidebarComponent, HttpClientTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(TableFiltersSidebarComponent);
    component = fixture.componentInstance;
    resultsCenterService = TestBed.inject(ResultsCenterService);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('indicatorOptionFilter', () => {
    it('should return true when indicator is null', () => {
      expect(component.indicatorOptionFilter(null)).toBe(true);
    });

    it('should return true when indicator_id is null', () => {
      expect(component.indicatorOptionFilter({ indicator_id: null })).toBe(true);
    });

    it('should return true when indicator_id is undefined', () => {
      expect(component.indicatorOptionFilter({ indicator_id: undefined })).toBe(true);
    });

    it('should return true when indicator_id is NaN', () => {
      expect(component.indicatorOptionFilter({ indicator_id: 'not-a-number' as any })).toBe(true);
    });

    it('should return false when indicator_id is in hiddenIds', () => {
      component.indicatorHiddenIds = [1, 2, 3];
      expect(component.indicatorOptionFilter({ indicator_id: 1 })).toBe(false);
    });

    it('should return true when indicator_id is not in hiddenIds', () => {
      component.indicatorHiddenIds = [1, 2, 3];
      expect(component.indicatorOptionFilter({ indicator_id: 4 })).toBe(true);
    });
  });

  describe('toggleSidebar', () => {
    it('should toggle showSignal from false to true', () => {
      const showSignal = component.showSignal;
      showSignal.set(false);
      component.toggleSidebar();
      expect(showSignal()).toBe(true);
    });

    it('should toggle showSignal from true to false', () => {
      const showSignal = component.showSignal;
      showSignal.set(true);
      component.toggleSidebar();
      expect(showSignal()).toBe(false);
    });
  });

  describe('ngAfterViewInit', () => {
    it('should set multiselectRefs', () => {
      component.ngAfterViewInit();
      expect(resultsCenterService.multiselectRefs()).toBeDefined();
      expect(Object.keys(resultsCenterService.multiselectRefs())).toEqual(['indicator', 'status', 'project', 'lever', 'year']);
    });
  });
});
