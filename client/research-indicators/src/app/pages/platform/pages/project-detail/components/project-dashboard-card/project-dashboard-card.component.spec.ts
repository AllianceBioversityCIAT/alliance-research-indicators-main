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

  it('should expose rank colors and render every state branch', () => {
    fixture.componentRef.setInput('items', [
      { id: 'a', label: 'A', count: 4 },
      { id: 'b', label: 'B', count: 3 },
      { id: 'c', label: 'C', count: 2 },
      { id: 'd', label: 'D', count: 1 }
    ]);
    fixture.detectChanges();

    expect(component.barColor(0)).toBe('#358540');
    expect(component.barColor(3)).toBe('#112F5C');

    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Loading chart');

    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Try again');

    fixture.componentRef.setInput('error', false);
    fixture.componentRef.setInput('empty', true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No data available');
  });
});
