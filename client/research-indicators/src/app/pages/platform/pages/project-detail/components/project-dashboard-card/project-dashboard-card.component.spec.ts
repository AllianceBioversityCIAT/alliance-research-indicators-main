import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProjectDashboardCardComponent } from './project-dashboard-card.component';

describe('ProjectDashboardCardComponent', () => {
  let component: ProjectDashboardCardComponent;
  let fixture: ComponentFixture<ProjectDashboardCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectDashboardCardComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectDashboardCardComponent);
    component = fixture.componentInstance;
  });

  it('should calculate counts and percentages for max-based layouts', () => {
    fixture.componentRef.setInput('items', [
      { id: 'a', label: 'A', count: 10 },
      { id: 'b', label: 'B', count: 5 }
    ]);
    fixture.componentRef.setInput('layout', 'columns');
    fixture.detectChanges();

    expect(component.maxCount()).toBe(10);
    expect(component.totalCount()).toBe(15);
    expect(component.fillPercent(10)).toBe(100);
    expect(component.fillPercent(5)).toBe(50);
    expect(component.fillPercent(0)).toBe(0);
  });

  it('should format linked results label', () => {
    expect(component.linkedResultsLabel(1)).toBe('1 result');
    expect(component.linkedResultsLabel(4)).toBe('4 results');
  });

  it('should calculate percentages for total-based layouts', () => {
    fixture.componentRef.setInput('items', [
      { id: 'a', label: 'A', count: 8 },
      { id: 'b', label: 'B', count: 2 }
    ]);
    fixture.componentRef.setInput('layout', 'rows-stacked');
    fixture.detectChanges();

    expect(component.fillPercent(8)).toBe(80);

    fixture.componentRef.setInput('layout', 'rows-stacked-lever');
    fixture.detectChanges();
    expect(component.fillPercent(2)).toBe(20);

    fixture.componentRef.setInput('layout', 'rows');
    fixture.detectChanges();
    expect(component.fillPercent(10)).toBe(100);
  });

  it('should handle empty and fallback calculations', () => {
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();

    expect(component.maxCount()).toBe(0);
    expect(component.fillPercent(10)).toBe(0);
    expect(component.partnerBarWidthPercent(10)).toBe(0);

    fixture.componentRef.setInput('items', [{ id: 'a', label: 'A', count: 4 }]);
    fixture.componentRef.setInput('layout', 'rows-partners');
    fixture.detectChanges();

    expect(component.partnerBarWidthPercent(4)).toBe(94);
    expect(component.partnerBarWidthPercent(0)).toBe(0);
    expect(component.fillPercent(4)).toBe(100);

    fixture.componentRef.setInput('items', [{ id: 'zero', label: 'Zero', count: 0 }]);
    fixture.componentRef.setInput('layout', 'rows');
    fixture.detectChanges();
    expect(component.fillPercent(1)).toBe(0);

    fixture.componentRef.setInput('items', [{ id: 'a', label: 'A', count: 5 }]);
    fixture.componentRef.setInput('layout', 'unknown-layout');
    fixture.detectChanges();
    expect(component.fillPercent(5)).toBe(100);

    fixture.componentRef.setInput('items', [{ id: 'a', label: 'A', count: 0 }]);
    fixture.componentRef.setInput('layout', 'unknown-layout');
    fixture.detectChanges();
    expect(component.fillPercent(5)).toBe(0);
  });

  it('should expose rank colors and render every state branch (R-PD-007)', () => {
    fixture.componentRef.setInput('title', 'Top partners');
    fixture.componentRef.setInput('items', [
      { id: 'a', label: 'A', count: 4 },
      { id: 'b', label: 'B', count: 3 },
      { id: 'c', label: 'C', count: 2 },
      { id: 'd', label: 'D', count: 1 }
    ]);
    fixture.detectChanges();

    expect(component.barColor(0)).toBe('var(--ac-green-500)');
    expect(component.barColor(3)).toBe('var(--ac-primary-blue-600)');

    // Loading state with skeleton and accessible status role
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const loadingEl = fixture.nativeElement.querySelector('[role="status"]');
    expect(loadingEl).toBeTruthy();
    expect(loadingEl.getAttribute('aria-label')).toBe('Loading Top partners');
    expect(fixture.nativeElement.querySelector('p-skeleton')).toBeTruthy();

    // Error state with alert role, custom message, and retry button
    const retrySpy = jest.fn();
    component.retry.subscribe(retrySpy);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', true);
    fixture.componentRef.setInput('errorMessage', 'We could not load top partner institutions. Please try again.');
    fixture.detectChanges();

    const alertEl = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alertEl).toBeTruthy();
    expect(alertEl.textContent).toContain('We could not load top partner institutions. Please try again.');
    const retryButton = alertEl.querySelector('button');
    expect(retryButton).toBeTruthy();
    expect(retryButton.getAttribute('aria-label')).toBe('Retry loading Top partners');
    retryButton.click();
    expect(retrySpy).toHaveBeenCalledTimes(1);

    // Empty state distinct from error state (error ≠ empty)
    fixture.componentRef.setInput('error', false);
    fixture.componentRef.setInput('empty', true);
    fixture.componentRef.setInput('emptyMessage', 'No partner institutions were found for this project.');
    fixture.componentRef.setInput('iconClass', 'pi pi-building');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('[role="status"]')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('No partner institutions were found for this project.');
    expect(fixture.nativeElement.textContent).not.toContain('We could not load');
    expect(fixture.nativeElement.querySelector('.pi-building')).toBeTruthy();
  });
});
