import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { Table } from 'primeng/table';
import { signal } from '@angular/core';
import { ProjectResultsTableComponent } from './project-results-table.component';
import { CacheService } from '@shared/services/cache/cache.service';
import { AllModalsService } from '@shared/services/cache/all-modals.service';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';
import { ProjectResultsTableService } from './project-results-table.service';
import { CurrentResultService } from '@shared/services/cache/current-result.service';
import { ApiService } from '@shared/services/api.service';

describe('ProjectResultsTableComponent', () => {
  let component: ProjectResultsTableComponent;
  let fixture: ComponentFixture<ProjectResultsTableComponent>;
  let cacheService: Partial<CacheService>;
  let allModalsService: Partial<AllModalsService>;
  let createResultManagementService: Partial<CreateResultManagementService>;
  let projectResultsTableService: Partial<ProjectResultsTableService>;

  beforeEach(async () => {
    cacheService = {
      headerHeight: signal(100),
      navbarHeight: signal(50),
      tableFiltersSidebarHeight: signal(200),
      hasSmallScreen: signal(false),
      projectResultsSearchValue: signal('')
    };

    allModalsService = {
      openModal: jest.fn()
    };

    createResultManagementService = {
      setContractId: jest.fn(),
      setPresetFromProjectResultsTable: jest.fn(),
      setResultCreationEntryContext: jest.fn()
    };

    projectResultsTableService = {
      contractId: '',
      getData: jest.fn(),
      resultList: signal([]),
      loading: signal(false)
    };

    const currentResultService = {
      validateOpenResult: jest.fn()
    };

    const apiService = {
      GET_Results: jest.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProjectResultsTableComponent, HttpClientTestingModule],
      providers: [
        provideRouter([]),
        { provide: CacheService, useValue: cacheService },
        { provide: AllModalsService, useValue: allModalsService },
        { provide: CreateResultManagementService, useValue: createResultManagementService },
        { provide: ProjectResultsTableService, useValue: projectResultsTableService },
        { provide: CurrentResultService, useValue: currentResultService },
        { provide: ApiService, useValue: apiService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectResultsTableComponent);
    component = fixture.componentInstance;
    component.contractId = 'A123';
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize contractId and call getData on ngOnInit', () => {
    expect(projectResultsTableService.contractId).toBe('A123');
    expect(projectResultsTableService.getData).toHaveBeenCalled();
  });

  it('should clear table and reset search value', () => {
    const mockTable = {
      clear: jest.fn()
    } as unknown as Table;
    const searchValueSignal = signal('test');
    cacheService.projectResultsSearchValue = searchValueSignal;

    component.clear(mockTable);

    expect(mockTable.clear).toHaveBeenCalled();
    expect(searchValueSignal()).toBe('');
  });

  it('should open create result modal for project', () => {
    component.openCreateResultForProject();

    expect(createResultManagementService.setContractId).toHaveBeenCalledWith('A123');
    expect(createResultManagementService.setPresetFromProjectResultsTable).toHaveBeenCalledWith(true);
    expect(createResultManagementService.setResultCreationEntryContext).toHaveBeenCalledWith('project');
    expect(allModalsService.openModal).toHaveBeenCalledWith('createResult');
  });

  it('should reset contractId and preset on ngOnDestroy', () => {
    component.ngOnDestroy();

    expect(createResultManagementService.setContractId).toHaveBeenCalledWith(null);
    expect(createResultManagementService.setPresetFromProjectResultsTable).toHaveBeenCalledWith(false);
    expect(createResultManagementService.setResultCreationEntryContext).toHaveBeenCalledWith(null);
  });

  it('should return danger severity for EDITING status', () => {
    expect(component.getSeverity('EDITING')).toBe('danger');
  });

  it('should return negotiation severity for SUBMMITED status', () => {
    expect(component.getSeverity('SUBMMITED')).toBe('negotiation');
  });

  it('should return success severity for ACCEPT status', () => {
    expect(component.getSeverity('ACCEPT')).toBe('success');
  });

  it('should return null for unknown status', () => {
    expect(component.getSeverity('UNKNOWN')).toBeNull();
  });

  it('should return null for renewal status', () => {
    expect(component.getSeverity('renewal')).toBeNull();
  });

  it('should calculate scroll height correctly', () => {
    const height = component.getScrollHeight();
    expect(height).toBeDefined();
    expect(height).toContain('calc(100vh -');
  });

  it('should calculate scroll height correctly with small screen', () => {
    // Create a new signal that can be updated
    const hasSmallScreenSignal = signal(true);
    cacheService.hasSmallScreen = hasSmallScreenSignal;
    
    // Recreate component with updated cacheService
    fixture = TestBed.createComponent(ProjectResultsTableComponent);
    component = fixture.componentInstance;
    component.contractId = 'A123';
    fixture.detectChanges();
    
    const height = component.getScrollHeight();
    expect(height).toBeDefined();
    expect(height).toContain('calc(100vh -');
    // Total should be: 100 + 50 + 200 + 240 = 590 for small screen
    expect(height).toContain('590');
  });
});
