import { Component, signal, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';
import { ManualAnchorsDirective } from './directives/manual-anchors.directive';
import { MANUAL_MODULES } from './data/manual-modules';

/**
 * Shell of the public STAR User Manual.
 *
 * Public on purpose: the manual answers "how do I use STAR?", a question a
 * person may well have before they can sign in, so the route sits outside the
 * authenticated area and pulls in no user data.
 *
 * `ViewEncapsulation.None` with a `.um-` class prefix: the manual is a small
 * documentation design system shared by every module page, and repeating the
 * same typography and callout rules inside each page's stylesheet would both
 * duplicate them and push each file toward the 8 kB component-style budget.
 */
@Component({
  selector: 'app-user-manual',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, S3ImageUrlPipe, ManualAnchorsDirective],
  templateUrl: './user-manual.component.html',
  styleUrls: ['./user-manual.component.scss', './user-manual-content.scss'],
  encapsulation: ViewEncapsulation.None
})
export default class UserManualComponent {
  readonly modules = MANUAL_MODULES;

  /** Drives the off-canvas sidebar on narrow screens only. */
  readonly menuOpen = signal(false);

  toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }
}
