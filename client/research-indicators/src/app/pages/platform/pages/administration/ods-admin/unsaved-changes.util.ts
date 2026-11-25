/**
 * One discard prompt for every selection change (design §6.9, D-STF-32).
 * `showGlobalAlert` appends (`actions.service.ts:186`), so a second request
 * while the prompt is open is ignored instead of stacking another alert.
 *
 * @akili-spec institutional-performance/strategy-framework T-19
 */

import { ActionsService } from '@shared/services/actions.service';

const promptOpen = new WeakMap<ActionsService, boolean>();

/**
 * Runs `next` immediately when the form is clean. When it is dirty, asks
 * once. Discard runs `next`. Keep editing runs `onKeep` when one was given,
 * and does not run `next`. `onKeep` is how a one-way select puts its old
 * label back: writing it before the answer also sticks on Discard.
 * `subject` is the open code, or `the new element` for a create.
 */
export function guardDiscard(actions: ActionsService, dirty: boolean, subject: string, next: () => void, onKeep?: () => void): void {
  if (promptOpen.get(actions) === true) return;
  if (!dirty) {
    next();
    return;
  }
  const focused = document.activeElement;
  promptOpen.set(actions, true);
  const close = (): void => {
    promptOpen.set(actions, false);
  };
  const restoreFocus = (): void => {
    setTimeout(() => {
      if (!(focused instanceof HTMLElement)) return;
      if (!focused.isConnected || focused.hasAttribute('disabled')) return;
      if ('disabled' in focused && (focused as HTMLButtonElement).disabled) return;
      focused.focus();
    }, 0);
  };
  actions.showGlobalAlert({
    severity: 'warning',
    summary: 'Discard changes?',
    detail: `Your edits to ${subject} will be lost.`,
    hideCloseButton: true,
    confirmCallback: {
      label: 'Discard',
      event: () => {
        close();
        next();
        restoreFocus();
      }
    },
    cancelCallback: {
      label: 'Keep editing',
      event: () => {
        close();
        onKeep?.();
        restoreFocus();
      }
    }
  });
}
