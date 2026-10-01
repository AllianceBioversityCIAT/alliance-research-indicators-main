import { ComponentFixture, TestBed } from '@angular/core/testing';
import HomeManualComponent from './home-manual.component';

describe('HomeManualComponent', () => {
  let component: HomeManualComponent;
  let fixture: ComponentFixture<HomeManualComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeManualComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(HomeManualComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('starts with the filled Home and no area selected', () => {
    expect(component.hasResults()).toBe(true);
    expect(component.activeZone()).toBe(0);
    expect(component.activeZoneDetail()).toBeNull();
  });

  it('describes the area a reader picks', () => {
    component.selectZone(4);
    expect(component.activeZoneDetail()?.name).toBe('My results by status');
  });

  it('clears the selection when the same area is picked twice', () => {
    component.selectZone(2);
    component.selectZone(2);
    expect(component.activeZone()).toBe(0);
    expect(component.activeZoneDetail()).toBeNull();
  });

  it('ignores an area number that is not on the map', () => {
    component.selectZone(99);
    expect(component.activeZoneDetail()).toBeNull();
  });

  it('gives every area a heading that exists on the page', () => {
    const ids: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('section[id]'),
      (s: Element) => s.id
    );
    for (const zone of component.zones) {
      expect(ids).toContain(zone.anchor);
    }
  });

  it('gives every task launcher answer a heading that exists on the page', () => {
    const ids: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('section[id]'),
      (s: Element) => s.id
    );
    for (const task of component.tasks) {
      expect(ids).toContain(task.anchor);
    }
  });

  it('hides "My latest results" in the empty-account preview, matching the real Home', () => {
    component.hasResults.set(false);
    fixture.detectChanges();
    const map: HTMLElement = fixture.nativeElement.querySelector('.hm-mock');
    expect(map.textContent).toContain('stays');
    expect(map.textContent).not.toContain('View and track your most recent results.');
  });

  it('opens one task at a time', () => {
    component.toggleTask('report');
    expect(component.openTask()).toBe('report');
    component.toggleTask('finish');
    expect(component.openTask()).toBe('finish');
    component.toggleTask('finish');
    expect(component.openTask()).toBeNull();
  });
});
