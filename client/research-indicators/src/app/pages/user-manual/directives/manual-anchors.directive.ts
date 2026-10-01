import { Directive, HostListener, inject } from '@angular/core';
import { Location } from '@angular/common';

/**
 * Makes every in-page `href="#section"` link inside the host scroll to that
 * section instead of navigating away from the manual.
 *
 * Two things in this app break a plain fragment link, and they stack:
 *
 * 1. `index.html` declares `<base href="/">`. A fragment-only URL resolves
 *    against the document's base URL rather than the current address, so the
 *    browser reads `#glossary` as `/#glossary` and leaves the manual for the
 *    app root — which, for a signed-in reader, lands on STAR's own Home.
 * 2. The router is bootstrapped with `withViewTransitions()` only; there is no
 *    `withInMemoryScrolling({ anchorScrolling: 'enabled' })`, so handing the
 *    fragment to the router would not scroll either.
 *
 * Either one could be fixed globally, but both changes would alter navigation
 * for every page in STAR. The manual owns its own anchors here instead.
 *
 * Applied once to the manual's content area, it works by delegation, so a new
 * chapter needs no per-link wiring and cannot forget it.
 */
@Directive({ selector: '[appManualAnchors]' })
export class ManualAnchorsDirective {
  private readonly location = inject(Location);

  @HostListener('click', ['$event'])
  onClick(event: MouseEvent): void {
    // Leave already-handled clicks and "open in a new tab/window" alone.
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const node = event.target;
    const anchor = node instanceof Element ? node.closest('a[href]') : null;
    if (!anchor) {
      return;
    }

    // Read the authored value, not `anchor.href` — the DOM property resolves
    // against `<base href>` and would already have lost the fragment-only form.
    const href = anchor.getAttribute('href') ?? '';
    if (!href.startsWith('#') || href.length < 2) {
      return;
    }

    const id = href.slice(1);
    const target = document.getElementById(id);
    if (!target) {
      return;
    }

    event.preventDefault();

    const reduceMotion = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });

    // Someone reading with a keyboard or a screen reader has to land in the
    // section too, not just watch the page move.
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    target.focus({ preventScroll: true });

    // Keep the address bar honest so the section stays linkable and copyable.
    // `Location` rather than `history` directly, so Angular's own view of the
    // URL stays in sync; `replaceState` so Back still leaves the manual rather
    // than replaying every heading the reader visited.
    const pathWithoutFragment = this.location.path(true).split('#')[0];
    this.location.replaceState(`${pathWithoutFragment}#${id}`);
  }
}
