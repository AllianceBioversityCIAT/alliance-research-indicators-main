import { ComponentFixture, TestBed } from '@angular/core/testing';
import SearchAResultComponent from './search-a-result.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { Router } from '@angular/router';

describe('ResultsExplorerComponent', () => {
  let component: SearchAResultComponent;
  let fixture: ComponentFixture<SearchAResultComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchAResultComponent, HttpClientTestingModule, RouterTestingModule]
    }).compileComponents();

    fixture = TestBed.createComponent(SearchAResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should update pagination signals on onPageChange', () => {
    component.onPageChange({ first: 10, rows: 20 });
    expect(component.first()).toBe(10);
    expect(component.rows()).toBe(20);
  });

  it('should default pagination values when onPageChange receives undefineds', () => {
    component.onPageChange({ first: undefined as any, rows: undefined as any } as any);
    expect(component.first()).toBe(0);
    expect(component.rows()).toBe(5);
  });

  it('should return a defined value from getIndicatorTypeIcon', () => {
    const result = component.getIndicatorTypeIcon('policy');
    expect(result).toBeDefined();
  });

  it('should navigate to result route on openResult', () => {
    const router = TestBed.inject(Router);
    const navigateSpy = jest.spyOn(router, 'navigate');
    component.openResult({ platform_code: 'PLT', result_official_code: '123' } as any);
    expect(navigateSpy).toHaveBeenCalledWith(['/result/PLT-123/general-information']);
  });
});
