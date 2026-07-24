import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SearchExportControlsComponent } from './search-export-controls.component';
import { fakeAsync, tick } from '@angular/core/testing';

describe('SearchExportControlsComponent', () => {
  let component: SearchExportControlsComponent;
  let fixture: ComponentFixture<SearchExportControlsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchExportControlsComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchExportControlsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit searchChange after debounce', fakeAsync(() => {
    const spy = jest.spyOn(component.searchChange, 'emit');
    const input = document.createElement('input');
    input.value = 'test search';
    
    component.onInputChange({ target: input } as any);
    
    expect(spy).not.toHaveBeenCalled();
    tick(500);
    expect(spy).toHaveBeenCalledWith('test search');
  }));

  it('should trim search value', fakeAsync(() => {
    const spy = jest.spyOn(component.searchChange, 'emit');
    const input = document.createElement('input');
    input.value = '  test search  ';
    
    component.onInputChange({ target: input } as any);
    
    tick(500);
    expect(spy).toHaveBeenCalledWith('test search');
  }));

  it('should emit apply when apply is called', () => {
    const spy = jest.spyOn(component.apply, 'emit');
    component.apply.emit();
    expect(spy).toHaveBeenCalled();
  });

  it('should emit clear when clear is called', () => {
    const spy = jest.spyOn(component.clear, 'emit');
    component.clear.emit();
    expect(spy).toHaveBeenCalled();
  });

  it('should complete destroy$ on ngOnDestroy', () => {
    const destroySpy = jest.spyOn(component['destroy$'], 'next');
    const completeSpy = jest.spyOn(component['destroy$'], 'complete');
    
    component.ngOnDestroy();
    
    expect(destroySpy).toHaveBeenCalled();
    expect(completeSpy).toHaveBeenCalled();
  });

  it('should not emit duplicate values', fakeAsync(() => {
    const spy = jest.spyOn(component.searchChange, 'emit');
    const input = document.createElement('input');
    input.value = 'test';
    
    component.onInputChange({ target: input } as any);
    component.onInputChange({ target: input } as any);
    
    tick(500);
    expect(spy).toHaveBeenCalledTimes(1);
  }));

  it('onEnter should emit searchChange with trimmed value from input', () => {
    const spy = jest.spyOn(component.searchChange, 'emit');
    const input = document.createElement('input');
    input.value = '  query on enter  ';
    component.onEnter({ target: input } as unknown as Event);
    expect(spy).toHaveBeenCalledWith('query on enter');
  });
});

