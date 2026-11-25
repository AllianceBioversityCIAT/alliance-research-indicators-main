import { ActionsService } from '@shared/services/actions.service';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import { guardDiscard } from './unsaved-changes.util';

// @akili-spec institutional-performance/strategy-framework T-19 — §6.9, D-STF-32.
// The alert is answered through the callbacks showGlobalAlert received.

describe('guardDiscard', () => {
  const attached: HTMLElement[] = [];

  afterEach(() => {
    for (const node of attached) node.remove();
    attached.length = 0;
  });

  const actions = () => {
    const alerts: GlobalAlert[] = [];
    const service = {
      showGlobalAlert: jest.fn((alert: GlobalAlert) => {
        alerts.push(alert);
      })
    };
    return { service: service as unknown as ActionsService, alerts, show: service.showGlobalAlert };
  };

  it('runs the next action when the form is clean and does not ask', () => {
    const { service, show } = actions();
    const next = jest.fn();

    guardDiscard(service, false, '1.1.1', next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(show).not.toHaveBeenCalled();
  });

  it('asks once, keeps the form on Keep editing, and proceeds on Discard', () => {
    const { service, alerts, show } = actions();
    const next = jest.fn();

    guardDiscard(service, true, '1.1.1', next);
    guardDiscard(service, true, '1.1.2', jest.fn());

    expect(show).toHaveBeenCalledTimes(1);
    expect(alerts[0].summary).toBe('Discard changes?');
    expect(alerts[0].detail).toBe('Your edits to 1.1.1 will be lost.');
    expect(alerts[0].hideCloseButton).toBe(true);
    expect(alerts[0].confirmCallback?.label).toBe('Discard');
    expect(alerts[0].cancelCallback?.label).toBe('Keep editing');
    expect(next).not.toHaveBeenCalled();

    alerts[0].cancelCallback?.event?.();
    expect(next).not.toHaveBeenCalled();

    guardDiscard(service, true, '1.1.1', next);
    alerts[1].confirmCallback?.event?.();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('runs onKeep only for Keep editing, and a clean change still runs next', () => {
    const { service, alerts, show } = actions();
    const next = jest.fn();
    const onKeep = jest.fn();

    guardDiscard(service, false, '1.1.1', next, onKeep);
    expect(next).toHaveBeenCalledTimes(1);
    expect(onKeep).not.toHaveBeenCalled();
    expect(show).not.toHaveBeenCalled();

    guardDiscard(service, true, '1.1.1', next, onKeep);
    alerts[0].confirmCallback?.event?.();
    expect(next).toHaveBeenCalledTimes(2);
    expect(onKeep).not.toHaveBeenCalled();

    guardDiscard(service, true, '1.1.1', next, onKeep);
    alerts[1].cancelCallback?.event?.();
    expect(next).toHaveBeenCalledTimes(2);
    expect(onKeep).toHaveBeenCalledTimes(1);

    guardDiscard(service, true, '1.1.2', jest.fn());
    expect(show).toHaveBeenCalledTimes(3);
  });

  it('returns focus to the element that was active when the prompt opened', async () => {
    const button = document.createElement('button');
    const sink = document.createElement('button');
    document.body.append(button, sink);
    attached.push(button, sink);
    const { service, alerts } = actions();
    const next = jest.fn();
    const onKeep = jest.fn();
    const flush = () => new Promise(resolve => setTimeout(resolve, 0));

    button.focus();
    guardDiscard(service, true, '1.1.1', next, onKeep);
    sink.focus();
    alerts[0].cancelCallback?.event?.();
    await flush();
    expect(document.activeElement).toBe(button);
    expect(onKeep).toHaveBeenCalledTimes(1);
    expect(next).not.toHaveBeenCalled();

    button.focus();
    guardDiscard(service, true, '1.1.1', next, onKeep);
    sink.focus();
    alerts[1].confirmCallback?.event?.();
    await flush();
    expect(document.activeElement).toBe(button);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
