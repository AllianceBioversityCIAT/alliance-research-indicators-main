// Plain-language explanations shown as tooltips across the monitor (quick views, KPI cards,
// coverage charts, legends). One text per concept, so a state is explained the same way
// wherever it appears. Business language, 1–2 lines, no implementation terms.

export const PFM_HELP = {
  // Quick views
  allResults: 'Every result of a contributing project in this view, whatever its status.',
  needAttention: 'Still on us: mapping pending, ready to sync or rejected by PRMS.',
  pendingApproval: 'Not approved in STAR yet: the PI needs to approve them before they can be reported.',
  mappingIncomplete: 'The CGIAR Portfolio mapping is still Pending: not started yet or partly filled in.',
  readyToSync: 'Mapping complete and not in PRMS yet: these can be sent now.',
  rejected: 'Sent to PRMS and returned by its reviewers. Check the reason, fix the result and sync it again.',
  synced: 'Already in PRMS, whatever its review status: pending review, approved or rejected. Done on our side.',

  // Terms
  outOfScope:
    'Results of a contributing project that were explicitly marked as not contributing to any Science Program, so they are never sent to PRMS.',

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
