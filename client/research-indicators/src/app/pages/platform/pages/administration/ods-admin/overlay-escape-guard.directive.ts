import { DestroyRef, Directive, ElementRef, HostListener, inject, OnInit } from '@angular/core';

// @akili-spec institutional-performance/strategy-framework T-17 — design §6.5, §6.6, NFR-STF-004.
// PrimeNG select, multiselect and autocomplete hide on Escape without stopPropagation.
// The drawer then sees the same keydown on document (bubble) and closes, dropping unsaved edits.
// Capture records whether an overlay of THIS panel is open. The form (bubble) and body (bubble)
// then stop the event before the drawer: the form covers a trigger inside the panel, body covers
// an overlay appended to the body. The overlay's own handler still runs, because both listeners
// are after it. The next Escape, with nothing of this panel open, is not stopped, so the drawer
// closes and the page returns focus to the opener as before.
// An expanded control elsewhere in the document (the admin flyout, the org tree) must not count:
// otherwise every Escape would be swallowed and the drawer could not close.

const EXPANDED = '[aria-expanded="true"]';
const OVERLAY_ROOT = '.p-select-overlay, .p-multiselect-overlay, .p-autocomplete-overlay';

@Directive({
  selector: '[appOverlayEscapeGuard]',
  standalone: true
})
export class OverlayEscapeGuardDirective implements OnInit {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  /** Set in the capture phase, before the overlay's handler clears aria-expanded. */
  private expandedAtCapture = false;

  ngOnInit(): void {
    const doc = this.host.nativeElement.ownerDocument;
    const onCapture = (event: KeyboardEvent): void => {
      if (!isEscape(event)) return;
      this.expandedAtCapture = panelOverlayOpen(this.host.nativeElement, doc);
    };
    const onBody = (event: KeyboardEvent): void => {
      if (!isEscape(event) || !this.expandedAtCapture) return;
      event.stopPropagation();
    };
    doc.addEventListener('keydown', onCapture, true);
    doc.body.addEventListener('keydown', onBody);
    this.destroyRef.onDestroy(() => {
      doc.removeEventListener('keydown', onCapture, true);
      doc.body.removeEventListener('keydown', onBody);
    });
  }

  @HostListener('keydown', ['$event'])
  onHostKeydown(event: KeyboardEvent): void {
    if (!isEscape(event) || !this.expandedAtCapture) return;
    event.stopPropagation();
  }
}

function isEscape(event: KeyboardEvent): boolean {
  return event.key === 'Escape' || event.code === 'Escape';
}

/** Open only when this panel's own trigger is expanded, or a visible PrimeNG overlay is in the document. */
function panelOverlayOpen(host: HTMLElement, doc: Document): boolean {
  if (host.querySelector(EXPANDED) instanceof Element) return true;
  return Array.from(doc.querySelectorAll(OVERLAY_ROOT)).some(isShown);
}

function isShown(node: Element): boolean {
  if (!(node instanceof HTMLElement)) return false;
  if (node.hidden || node.getAttribute('aria-hidden') === 'true') return false;
  const style = node.ownerDocument.defaultView?.getComputedStyle(node);
  if (!style) return true;
  return style.display !== 'none' && style.visibility !== 'hidden';
}
