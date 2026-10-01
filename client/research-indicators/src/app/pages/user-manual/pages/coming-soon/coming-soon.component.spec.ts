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

  /**
   * The badge renders a Material Symbols ligature, so it must keep the icon
   * class and the `--icon` modifier that sizes it. It once carried
   * `um-section__num` alone, whose `font-family: 'Space Grotesk'` matched the
   * icon class's own font rule at equal specificity and won, printing the word
   * "folder_open" instead of a folder.
   *
   * This pins the markup only. The rule that actually decides the winner lives
   * in a stylesheet jsdom never loads, so the cascade itself is checked in a
   * real browser, not here.
   */
  it('keeps the icon classes the module badge needs', () => {
    const fixture = setup('projects');
    const badge: HTMLElement = fixture.nativeElement.querySelector('.um-section__num');
    expect(badge.classList).toContain('material-symbols-rounded');
    expect(badge.classList).toContain('um-section__num--icon');
    expect(badge.textContent?.trim()).toBe('folder_open');
  });

  it('always offers the chapters that are finished', () => {
    const fixture = setup('not-a-module');
    expect(fixture.componentInstance.published.length).toBeGreaterThan(0);
    expect(fixture.nativeElement.textContent).toContain('Home');
  });
});
