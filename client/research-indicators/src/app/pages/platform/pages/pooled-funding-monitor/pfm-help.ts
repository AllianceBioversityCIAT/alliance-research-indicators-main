// Plain-language explanations shown as tooltips across the monitor (quick views, KPI cards,
// coverage charts, legends). One text per concept, so a state is explained the same way
// wherever it appears. Business language, 1–2 lines, no implementation terms.

export const PFM_HELP = {
  // Quick views (Need attention = Mapping pending + Ready to sync + Rejected)
  allResults: 'Every result of a contributing project in this view, whatever its status.',
  needAttention: 'Results that still need something from us: finish the mapping, send them to PRMS, or fix what PRMS rejected.',
  mappingIncomplete: 'The CGIAR Portfolio mapping is still Pending: not started yet or partly filled in.',
  readyToSync: 'Mapping complete and not in PRMS yet: these can be sent now.',
  rejected: 'Sent to PRMS and returned by its reviewers. Check the reason, fix the result and sync it again.',
  synced: 'Already in PRMS: waiting for review or approved. Nothing to do on our side.',

  // Terms
  outOfScope:
    'Results of a contributing project that were explicitly marked as not contributing to any Science Program, so they are never sent to PRMS.',
  prmsScope: 'Results that should end up in PRMS: every result except those marked out of scope.',

  // PRMS review states (queue legend)
  pendingReview: 'Received by PRMS, waiting for its reviewers.',
  approved: 'Accepted by PRMS. Done.',
  rejectedState: 'Returned by PRMS. Check the reason, fix the result and sync it again.',

  // Coverage by Science Program
  spHowToRead:
    'One bar per Science Program: the full bar is all its results, the dark blue part is what is already in PRMS. The goal is a full bar. Click a program to see its results.',
  spSynced: 'Results of this Science Program already in PRMS.',
  spNotSynced: 'Results of this Science Program not in PRMS yet.'
} as const;
