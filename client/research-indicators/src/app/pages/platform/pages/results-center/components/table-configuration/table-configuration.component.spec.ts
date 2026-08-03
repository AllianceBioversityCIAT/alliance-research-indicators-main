import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TableConfigurationComponent } from './table-configuration.component';
import { ResultsCenterService } from '../../results-center.service';
import { CacheService } from '../../../../../../shared/services/cache/cache.service';
import { GetResultsService } from '../../../../../../shared/services/control-list/get-results.service';
import { CdkDragDrop } from '@angular/cdk/drag-drop';

describe('TableConfigurationComponent', () => {
  let component: TableConfigurationComponent;
  let fixture: ComponentFixture<TableConfigurationComponent>;
  let service: ResultsCenterService;

  const STORAGE_KEY = 'results-center-columns-order';

  const baseColumns = [
    { field: 'a', path: 'a', header: 'A' },
    { field: 'b', path: 'b', header: 'B' },
    { field: 'c', path: 'c', header: 'C' }
  ];

  function createComponent(afterConfigure?: () => void) {
    fixture = TestBed.createComponent(TableConfigurationComponent);
    component = fixture.componentInstance;
    if (afterConfigure) afterConfigure();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TableConfigurationComponent, HttpClientTestingModule],
      providers: [ResultsCenterService, CacheService, GetResultsService]
    }).compileComponents();

    service = TestBed.inject(ResultsCenterService);
    // Use a predictable set of columns for all tests
    service.tableColumns.set([...baseColumns]);
    // Clean LS between tests
    localStorage.removeItem(STORAGE_KEY);
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should initialize auxiliaryColumns with current service order', () => {
    createComponent(() => {
      service.tableColumns.set([
        { field: 'x', path: 'x', header: 'X' },
        { field: 'y', path: 'y', header: 'Y' }
      ]);
    });

    expect(component.auxiliaryColumns()).toEqual([
      { field: 'x', path: 'x', header: 'X' },
      { field: 'y', path: 'y', header: 'Y' }
    ]);
  });

  it('should load saved order from localStorage and reorder service columns', () => {
    const savedOrder = [
      { field: 'b', header: 'B' },
      { field: 'a', header: 'A' },
      { field: 'c', header: 'C' }
    ];
    jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => JSON.stringify(savedOrder));

    createComponent(() => {
      service.tableColumns.set([...baseColumns]);
    });

    expect(component.auxiliaryColumns()).toEqual([
      { field: 'b', header: 'B' },
      { field: 'a', header: 'A' },
      { field: 'c', header: 'C' }
    ]);
    expect(service.tableColumns().map(c => c.field)).toEqual(['b', 'a', 'c']);
  });

  it('should ignore saved order if invalid (missing fields) and keep current order', () => {
    // Missing one of the fields (e.g., no "c")
    const invalidSaved = [
      { field: 'b', header: 'B' },
      { field: 'a', header: 'A' }
    ];
    jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => JSON.stringify(invalidSaved));

    createComponent(() => {
      service.tableColumns.set([...baseColumns]);
    });

    // Should remain the same as service order
    expect(component.auxiliaryColumns()).toEqual(baseColumns);
    expect(service.tableColumns()).toEqual(baseColumns);
  });

  it('should handle malformed localStorage JSON gracefully', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => '{malformed json');

    createComponent(() => {
      service.tableColumns.set([...baseColumns]);
    });

    expect(component.auxiliaryColumns()).toEqual(baseColumns);
    // Error should be logged but not throw
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('drop() should reorder auxiliaryColumns based on drag indices', () => {
    createComponent(() => {
      service.tableColumns.set([...baseColumns]);
    });

    expect(component.auxiliaryColumns().map(c => c.field)).toEqual(['a', 'b', 'c']);

    const event = { previousIndex: 0, currentIndex: 2 } as unknown as CdkDragDrop<string[]>;
    component.drop(event);

    expect(component.auxiliaryColumns().map(c => c.field)).toEqual(['b', 'c', 'a']);
  });

  it('applyConfigurations() should save order and reorder service columns', () => {
    createComponent(() => {
      service.tableColumns.set([...baseColumns]);
    });

    // Set a new auxiliary order
    component.auxiliaryColumns.set([
      { field: 'c', path: 'c', header: 'C' },
      { field: 'a', path: 'a', header: 'A' },
      { field: 'b', path: 'b', header: 'B' }
    ]);

    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');
    component.applyConfigurations();

    // Saved payload should contain only field and header per implementation
    expect(setItemSpy).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify([
        { field: 'c', header: 'C' },
        { field: 'a', header: 'A' },
        { field: 'b', header: 'B' }
      ])
    );

    // Service columns should have been reordered to match auxiliaryColumns
    expect(service.tableColumns().map(c => c.field)).toEqual(['c', 'a', 'b']);
  });
});
