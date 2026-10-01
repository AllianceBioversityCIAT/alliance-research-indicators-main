import { Component, computed, signal } from '@angular/core';
import { S3ImageUrlPipe } from '@shared/pipes/s3-image-url.pipe';

/** One numbered area of the Home screen map. */
interface HomeZone {
  id: number;
  anchor: string;
  name: string;
  blurb: string;
}

/** One entry of the "What do you want to do?" launcher. */
interface HomeTask {
  id: string;
  goal: string;
  answer: string;
  anchor: string;
}

/**
 * "Home" chapter of the STAR User Manual.
 *
 * Written for people who report results, not for developers: it names what
 * is on screen, what each control does, and where each one leads. Every
 * behaviour described here was read from the Home page components
 * (`@platform/pages/home`) rather than assumed from the layout.
 */
@Component({
  selector: 'app-home-manual',
  imports: [S3ImageUrlPipe],
  templateUrl: './home-manual.component.html',
  styleUrls: ['./home-manual.component.scss', './home-manual-widgets.scss']
})
export default class HomeManualComponent {
  /** Screen-map hotspot the reader last picked; 0 means "nothing selected". */
  readonly activeZone = signal(0);

  /** Screen map shows either a filled Home or a brand-new account. */
  readonly hasResults = signal(true);

  readonly openTask = signal<string | null>(null);

  readonly zones: readonly HomeZone[] = [
    { id: 1, anchor: 'banner', name: 'Welcome banner', blurb: 'Announcements from the STAR team.' },
    { id: 2, anchor: 'main-actions', name: 'Main actions', blurb: 'Three shortcuts to the places you use most.' },
    { id: 3, anchor: 'latest', name: 'My latest results', blurb: 'Your three most recently updated results.' },
    { id: 4, anchor: 'by-status', name: 'My results by status', blurb: 'How many of your results sit at each stage.' },
    { id: 5, anchor: 'by-indicator', name: 'My results by indicator', blurb: 'How many results you have per indicator.' }
  ];

  readonly tasks: readonly HomeTask[] = [
    {
      id: 'report',
      goal: 'I need to report a new result',
      answer: 'Use Create Result in the blue top bar. It is always there, even before you have any results. The same button also appears next to My latest results once you have at least one.',
      anchor: 'latest'
    },
    {
      id: 'finish',
      goal: 'I started a result and need to finish it',
      answer: 'If it is one of your three most recent, open it straight from My latest results and watch the progress bar. Otherwise click the Editing row in My results by status to list every result you still have open.',
      anchor: 'by-status'
    },
    {
      id: 'pending',
      goal: 'I want to know what is still pending before the deadline',
      answer: 'Read My results by status. Any row that is not Approved still needs something from you or from a reviewer. Click the row to see exactly which results it counts.',
      anchor: 'by-status'
    },
    {
      id: 'colleague',
      goal: 'I am looking for a result somebody else reported',
      answer: 'Home only ever shows your own results. Open My results, switch the scope away from "My", or use the Search box in the top bar.',
      anchor: 'faq'
    },
    {
      id: 'project',
      goal: 'I want to see the results of one of my projects',
      answer: 'Use the My projects card, open the project, and read its results and dashboard from there.',
      anchor: 'main-actions'
    }
  ];

  readonly activeZoneDetail = computed(() => this.zones.find(z => z.id === this.activeZone()) ?? null);

  selectZone(id: number): void {
    this.activeZone.update(current => (current === id ? 0 : id));
  }

  toggleTask(id: string): void {
    this.openTask.update(current => (current === id ? null : id));
  }
}
