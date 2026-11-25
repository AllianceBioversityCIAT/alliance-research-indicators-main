/**
 * The delete flow (A8, then the blocked / confirm / notice alert, then A7).
 * The page supplies `resolveElement` and `prepareFocus` (design §6.5).
 * Alerts keep `hideCloseButton`. Focus returns to the opener when the alert
 * closes, and to the caller's target after the row is gone.
 *
 * @akili-spec institutional-performance/strategy-framework T-14
 */

import { Injectable, inject } from '@angular/core';
import { FrameworkBlocker, FrameworkEditorElement, FrameworkElementBlockers } from '@shared/interfaces/strategy-framework.interface';
import { ActionsService } from '@shared/services/actions.service';
import { ApiService } from '@shared/services/api.service';
import { frameworkErrorOf } from './utils/framework-error.util';

export interface FrameworkDeleteCommand {
  id: number;
  /** The control the alert returns focus to while the row is still there. */
  returnFocus: HTMLElement | null;
  /** Read after the blocker check, so a row that vanished is not confirmed. */
  resolveElement: () => { element: FrameworkEditorElement; levelName: string } | null;
  /**
   * Called when Delete is confirmed, before the request. Returns where focus
   * goes once the row has been removed and the view has refreshed.
   */
  prepareFocus: () => () => HTMLElement | null;
  onDeleted: () => Promise<void>;
}

@Injectable()
export class FrameworkDeleteHandler {
  private readonly api = inject(ApiService);
  private readonly actions = inject(ActionsService);
  private busy = false;

  async request(command: FrameworkDeleteCommand): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      const response = await this.api.GET_StrategyFrameworkElementBlockers(command.id);
      if (!response?.successfulRequest || !response.data) {
        this.openNotice(frameworkErrorOf(response?.errorDetail), command.returnFocus);
        return;
      }
      if (isBlocked(response.data)) {
        this.openBlocked(blockedDetail(response.data), command.returnFocus);
        return;
      }
      const resolved = command.resolveElement();
      if (!resolved) return;
      this.openConfirm(resolved.element, resolved.levelName, command);
    } catch (error) {
      this.openNotice(frameworkErrorOf(error), command.returnFocus);
    } finally {
      this.busy = false;
    }
  }

  private openConfirm(element: FrameworkEditorElement, levelName: string, command: FrameworkDeleteCommand): void {
    const detail = `Delete ${escapeHtml(levelName)} ${escapeHtml(element.code)} · ${escapeHtml(element.name)}?`;
    this.actions.showGlobalAlert({
      severity: 'delete',
      summary: 'Delete',
      detail,
      hideCloseButton: true,
      confirmCallback: {
        label: 'Delete',
        event: () => this.performDelete(command)
      },
      cancelCallback: {
        label: 'Cancel',
        event: () => this.focusReturn(command.returnFocus)
      }
    });
  }

  private openBlocked(detail: string, returnFocus: HTMLElement | null): void {
    this.actions.showGlobalAlert({
      severity: 'error',
      summary: 'Cannot delete',
      detail,
      hasNoCancelButton: true,
      hideCloseButton: true,
      confirmCallback: {
        label: 'Close',
        event: () => this.focusReturn(returnFocus)
      }
    });
  }

  private openNotice(message: string, returnFocus: HTMLElement | null): void {
    this.openBlocked(escapeHtml(message), returnFocus);
  }

  private async performDelete(command: FrameworkDeleteCommand): Promise<void> {
    const focus = command.prepareFocus();
    try {
      const response = await this.api.DELETE_StrategyFrameworkElement(command.id);
      if (!response?.successfulRequest) {
        const blockers = readBlockers(response?.errorDetail);
        if (blockers) this.openBlocked(blockersDetail(blockers), command.returnFocus);
        else this.openNotice(frameworkErrorOf(response?.errorDetail), command.returnFocus);
        return;
      }
      await command.onDeleted();
      await waitForRender();
      const target = focus();
      if (target?.isConnected) target.focus();
    } catch (error) {
      this.openNotice(frameworkErrorOf(error), command.returnFocus);
    }
  }

  private focusReturn(button: HTMLElement | null): void {
    if (button?.isConnected) button.focus();
  }
}

function isBlocked(summary: FrameworkElementBlockers): boolean {
  if (summary.children > 0 || summary.objectives > 0) return true;
  if ((summary.consumers ?? []).some(consumer => consumer.count > 0)) return true;
  return (summary.wayOut ?? []).some(way => way.trim() !== '');
}

function blockedDetail(summary: FrameworkElementBlockers): string {
  const lines: string[] = [];
  if (summary.children > 0) {
    lines.push(`${summary.children} ${summary.children === 1 ? 'child' : 'children'}`);
  }
  if (summary.objectives > 0) {
    lines.push(`${summary.objectives} ${summary.objectives === 1 ? 'institutional objective' : 'institutional objectives'}`);
  }
  for (const consumer of summary.consumers ?? []) {
    if (consumer.count > 0) lines.push(`${consumer.count} ${consumer.consumerName}`);
  }
  for (const way of summary.wayOut ?? []) {
    if (way.trim() !== '') lines.push(way.trim());
  }
  return lines.map(escapeHtml).join('<br>');
}

function blockersDetail(blockers: readonly FrameworkBlocker[]): string {
  return blockers
    .map(blocker => `${blocker.count} ${blocker.reason}. ${blocker.wayOut}`)
    .map(escapeHtml)
    .join('<br>');
}

function readBlockers(errorDetail: unknown): FrameworkBlocker[] | null {
  const found = findBlockers(errorDetail);
  if (!found || found.length === 0) return null;
  return found;
}

function findBlockers(value: unknown): FrameworkBlocker[] | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if (Array.isArray(record['blockers'])) return record['blockers'] as FrameworkBlocker[];
  if ('errors' in record) return findBlockers(record['errors']);
  return null;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function waitForRender(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}
