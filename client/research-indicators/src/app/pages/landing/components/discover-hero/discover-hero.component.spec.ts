import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DiscoverHeroComponent } from './discover-hero.component';

describe('DiscoverHeroComponent', () => {
  let component: DiscoverHeroComponent;
  let fixture: ComponentFixture<DiscoverHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DiscoverHeroComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(DiscoverHeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
