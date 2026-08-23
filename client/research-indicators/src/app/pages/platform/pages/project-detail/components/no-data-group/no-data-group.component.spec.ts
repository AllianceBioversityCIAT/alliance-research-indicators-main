import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal } from '@angular/core';
import { NoDataGroupComponent, NoDataGroupItem } from './no-data-group.component';

@Component({
  standalone: true,
  imports: [NoDataGroupComponent],
  template: '<app-no-data-group [items]="items()"></app-no-data-group>'
})
class TestHostComponent {
  readonly items = signal<NoDataGroupItem[]>([]);
}

describe('NoDataGroupComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent, NoDataGroupComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
  });

  it('should render nothing when items array is empty (KZ-015: initial state)', () => {
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section[aria-labelledby="no-data-group-title"]');
    expect(section).toBeNull();
    expect(fixture.nativeElement.textContent.trim()).toBe('');
  });

  it('should transition from empty to populated items and render names, reasons, and badge (KZ-015)', () => {
    // 1. Initial empty render
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();

    // 2. Transition: set populated items
    const testItems: NoDataGroupItem[] = [
      {
        name: 'Top partner institutions',
        reason: 'No partner institutions are linked to results on this project yet.',
        iconClass: 'pi pi-building'
      },
      {
        name: 'Top primary levers',
        reason: 'No primary levers are linked to results on this project yet.',
        iconClass: 'pi pi-sliders-h'
      }
    ];
    hostComponent.items.set(testItems);
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section[aria-labelledby="no-data-group-title"]');
    expect(section).not.toBeNull();

    const title = section.querySelector('#no-data-group-title');
    expect(title).not.toBeNull();
    expect(title.textContent).toContain('No data yet');

    const badge = section.querySelector('span');
    expect(badge.textContent).toContain('2 sections hidden');

    const listItems = section.querySelectorAll('li');
    expect(listItems.length).toBe(2);

    expect(listItems[0].textContent).toContain('Top partner institutions');
    expect(listItems[0].textContent).toContain('No partner institutions are linked to results on this project yet.');
    expect(listItems[0].querySelector('i.pi.pi-building')).not.toBeNull();

    expect(listItems[1].textContent).toContain('Top primary levers');
    expect(listItems[1].textContent).toContain('No primary levers are linked to results on this project yet.');
    expect(listItems[1].querySelector('i.pi.pi-sliders-h')).not.toBeNull();

    // 3. Transition: set back to empty
    hostComponent.items.set([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();
  });

  it('should use fallback icon when iconClass is not provided', () => {
    fixture.detectChanges();

    hostComponent.items.set([
      {
        name: 'Custom item',
        reason: 'No data for custom item.'
      }
    ]);
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section');
    expect(section).not.toBeNull();

    const icon = section.querySelector('i.pi.pi-info-circle');
    expect(icon).not.toBeNull();

    const badge = section.querySelector('span');
    expect(badge.textContent).toContain('1 section hidden');
  });
});
