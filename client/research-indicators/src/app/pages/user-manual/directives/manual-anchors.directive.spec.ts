import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Location } from '@angular/common';
import { ManualAnchorsDirective } from './manual-anchors.directive';

@Component({
  imports: [ManualAnchorsDirective],
  template: `
    <main appManualAnchors>
      <a id="static" href="#target">static fragment</a>
      <a id="nested" href="#target"><span id="inner">a word inside the link</span></a>
      <a id="mail" href="mailto:someone&#64;example.org">write</a>
      <a id="samesite" href="/target">a real page whose path resembles a section id</a>
      <a id="missing" href="#nowhere">dangling</a>
      <section id="target">the section</section>
    </main>
    <a id="outside" href="#target">outside the manual content</a>
  `
})
class HostComponent {}

describe('ManualAnchorsDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let scrolled: HTMLElement[];

  function clickOn(id: string, init: MouseEventInit = {}): MouseEvent {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    fixture.nativeElement.querySelector(`#${id}`).dispatchEvent(event);
    return event;
  }

  beforeEach(async () => {
    scrolled = [];
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    // jsdom implements neither of these.
    Element.prototype.scrollIntoView = function (this: HTMLElement) {
      scrolled.push(this);
    };
  });

  it('scrolls to the section a fragment names, instead of navigating', () => {
    const event = clickOn('static');
    expect(event.defaultPrevented).toBe(true);
    expect(scrolled.map(el => el.id)).toEqual(['target']);
  });

  /** Delegation is the point: one attribute has to cover every chapter's links. */
  it('handles a click that lands on an element inside the link', () => {
    const event = clickOn('inner');
    expect(event.defaultPrevented).toBe(true);
    expect(scrolled.map(el => el.id)).toEqual(['target']);
  });

  it('moves focus so a keyboard reader lands in the section too', () => {
    clickOn('static');
    const target: HTMLElement = fixture.nativeElement.querySelector('#target');
    expect(target.getAttribute('tabindex')).toBe('-1');
    expect(document.activeElement).toBe(target);
  });

  it('records the section in the URL without asking the router to navigate', () => {
    const location = TestBed.inject(Location);
    const replaceState = jest.spyOn(location, 'replaceState');
    clickOn('static');
    expect(replaceState).toHaveBeenCalledTimes(1);
    expect(replaceState.mock.calls[0][0]).toContain('#target');
  });

  it('leaves a link that is not a fragment alone', () => {
    const event = clickOn('mail');
    expect(event.defaultPrevented).toBe(false);
    expect(scrolled).toEqual([]);
  });

  /**
   * Pins the `startsWith('#')` guard specifically. Dropping it does not break
   * the mailto case above — `mailto:x` past the first character matches no
   * element id, so the "is there such a section?" check catches it anyway.
   * `/target` is the href that tells the two apart: strip one character and it
   * names a real section, so without the guard a genuine navigation would be
   * swallowed and turned into a scroll.
   */
  it('does not hijack a real navigation whose path resembles a section id', () => {
    const event = clickOn('samesite');
    expect(event.defaultPrevented).toBe(false);
    expect(scrolled).toEqual([]);
  });

  it('leaves a fragment with no matching section to the browser', () => {
    const event = clickOn('missing');
    expect(event.defaultPrevented).toBe(false);
    expect(scrolled).toEqual([]);
  });

  it('lets a modified click open the link the way the reader asked', () => {
    for (const modifier of [{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { button: 1 }]) {
      const event = clickOn('static', modifier);
      expect(event.defaultPrevented).toBe(false);
    }
    expect(scrolled).toEqual([]);
  });

  it('does not touch links outside the content it was applied to', () => {
    const event = clickOn('outside');
    expect(event.defaultPrevented).toBe(false);
    expect(scrolled).toEqual([]);
  });
});
