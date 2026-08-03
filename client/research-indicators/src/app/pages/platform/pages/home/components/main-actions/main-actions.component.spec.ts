import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainActionsComponent } from './main-actions.component';
import { ActivatedRoute } from '@angular/router';
import { HttpClientTestingModule } from '@angular/common/http/testing';

describe('MainActionsComponent', () => {
  let component: MainActionsComponent;
  let fixture: ComponentFixture<MainActionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainActionsComponent, HttpClientTestingModule],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: new Map()
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MainActionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
