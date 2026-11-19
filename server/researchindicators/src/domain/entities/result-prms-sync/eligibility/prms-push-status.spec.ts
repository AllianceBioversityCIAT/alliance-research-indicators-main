import {
  derivePrmsPushStatus,
  PrmsPushEvent,
  PrmsPushStatus,
} from './prms-push-status';

const push = (year: number, imported = false): PrmsPushEvent => ({
  kind: 'push',
  decision: null,
  year,
  imported,
});

const decision = (
  verb: string,
  year: number,
  imported = false,
): PrmsPushEvent => ({
  kind: 'decision',
  decision: verb,
  year,
  imported,
});

const expectStatus = (
  events: readonly PrmsPushEvent[],
  year: number,
  status: PrmsPushStatus['status'],
  resubmittable: boolean,
): void => {
  expect(derivePrmsPushStatus(events, year)).toEqual({
    year,
    status,
    resubmittable,
  });
};

describe('derivePrmsPushStatus', () => {
  it('S-3 refs 627/631: push then REJECT is resubmittable, and a further push is pending again', () => {
    const rejected = [push(2026), decision('REJECT', 2026)];
    expectStatus(rejected, 2026, 'rejected', true);

    expectStatus([...rejected, push(2026)], 2026, 'pending_review', false);
  });

  it('S-5 ref 698: id order wins when the second push timestamp is earlier than the REJECT', () => {
    // Array order is id order (339 push, 344 REJECT, 345 push). The
    // timestamps disagree with that order: the second push's occurred_at
    // is earlier than the REJECT's decided_at (P-1). The rule does not
    // read them; they are here so a timestamp sort flips this case.
    const ref698: Array<PrmsPushEvent & { occurredAt: string }> = [
      { ...push(2026), occurredAt: '2026-11-11T16:43:00Z' },
      { ...decision('REJECT', 2026), occurredAt: '2026-11-13T19:09:00Z' },
      { ...push(2026), occurredAt: '2026-11-13T14:42:00Z' },
    ];

    expectStatus(ref698, 2026, 'pending_review', false);
  });

  it('S-1 ref 702: a push with no later decision is pending and not resubmittable', () => {
    expectStatus([push(2026)], 2026, 'pending_review', false);
  });

  it('S-2: a push followed by APPROVE is approved and not resubmittable', () => {
    expectStatus(
      [push(2026), decision('APPROVE', 2026)],
      2026,
      'approved',
      false,
    );
  });

  it('S-4: no events for the year is never pushed and resubmittable', () => {
    expectStatus([], 2026, 'never_pushed', true);
    expectStatus([push(2025)], 2026, 'never_pushed', true);
  });

  it('S-6: a decision verb other than APPROVE or REJECT counts as no decision', () => {
    expectStatus(
      [push(2026), decision('APPROVED', 2026)],
      2026,
      'pending_review',
      false,
    );
    expectStatus([decision('REJECTED', 2026)], 2026, 'never_pushed', true);
  });

  it('S-26: a decision whose year is 2026 leaves the target year 2027 never pushed', () => {
    const events = [push(2026), decision('REJECT', 2026)];

    expectStatus(events, 2027, 'never_pushed', true);
    expectStatus(events, 2026, 'rejected', true);
  });

  it('S-27: an imported REJECT placed after a real push still leaves the year pending', () => {
    const events = [push(2026, false), decision('REJECT', 2026, true)];

    expectStatus(events, 2026, 'pending_review', false);
  });
});
