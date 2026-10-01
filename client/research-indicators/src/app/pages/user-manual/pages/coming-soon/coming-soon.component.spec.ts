import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import ComingSoonComponent from './coming-soon.component';

function setup(slug: string): ComponentFixture<ComingSoonComponent> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    imports: [ComingSoonComponent],
    providers: [
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ slug })) } }
    ]
  });
  const fixture = TestBed.createComponent(ComingSoonComponent);
  fixture.detectChanges();
  return fixture;
}

describe('ComingSoonComponent', () => {
  it('should create', () => {
    expect(setup('projects').componentInstance).toBeTruthy();
  });

  it('names the module a reader asked for', () => {
    const fixture = setup('projects');
    expect(fixture.componentInstance.module()?.label).toBe('Projects');
    expect(fixture.nativeElement.textContent).toContain('Projects');
  });

  it('says so plainly when the address matches no module', () => {
    const fixture = setup('not-a-module');
    expect(fixture.componentInstance.module()).toBeUndefined();
    expect(fixture.nativeElement.textContent).toContain('Chapter not found');
  });

  it('always offers the chapters that are finished', () => {
    const fixture = setup('not-a-module');
    expect(fixture.componentInstance.published.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain('Home');
  });
});
