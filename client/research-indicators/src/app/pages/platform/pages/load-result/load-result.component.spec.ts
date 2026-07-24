import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';

import LoadResultComponent from './load-result.component';

describe('LoadResultComponent', () => {
  let component: LoadResultComponent;
  let fixture: ComponentFixture<LoadResultComponent>;
  let routerMock: any;

  beforeEach(async () => {
    routerMock = { navigate: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [LoadResultComponent],
      providers: [{ provide: Router, useValue: routerMock }]
    }).compileComponents();

    fixture = TestBed.createComponent(LoadResultComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should set redirectTimeout and navigate on ngOnInit', () => {
    jest.useFakeTimers();
    component.ngOnInit();
    expect(component['redirectTimeout']).not.toBeNull();
    jest.advanceTimersByTime(1000);
    expect(routerMock.navigate).toHaveBeenCalledWith(['/']);
    jest.useRealTimers();
  });

  it('should clear redirectTimeout on ngOnDestroy', () => {
    jest.useFakeTimers();
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    component.ngOnInit();
    expect(component['redirectTimeout']).not.toBeNull();
    component.ngOnDestroy();
    expect(clearTimeoutSpy).toHaveBeenCalled();
    clearTimeoutSpy.mockRestore();
    jest.useRealTimers();
  });
});
