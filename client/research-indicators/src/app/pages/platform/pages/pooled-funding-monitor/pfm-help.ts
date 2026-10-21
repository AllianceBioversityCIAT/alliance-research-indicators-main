// Plain-language explanations shown as tooltips across the monitor (quick views, KPI cards,
// coverage charts, legends). One text per concept, so a state is explained the same way
// wherever it appears. Business language, 1–2 lines, no implementation terms.

export const PFM_HELP = {
  // Quick views
  allResults: 'Every result of a contributing project in this view, whatever its status.',
  needAttention: 'Results with nothing in PRMS yet: they still need their mapping finished or a sync.',
  mappingIncomplete: 'Approved results whose CGIAR Portfolio mapping is started but not finished. Applies once the result is approved in STAR.',
  readyToSync: 'Mapping complete and not in PRMS yet: these can be sent now.',
  rejected: 'Sent to PRMS and returned by its reviewers. Check the reason, fix the result and sync it again.',
  synced: 'Already in PRMS: waiting for review or approved.',

  // Terms
  outOfScope:
    'Results of a contributing project that were explicitly marked as not contributing to any Science Program, so they are never sent to PRMS.',
  prmsScope: 'Results that should end up in PRMS: every result except those marked out of scope.',

  // Progress bar
  completed: 'Completed = sent to PRMS or marked out of scope: a decision has already been taken on them.',

  // Our side (Alliance)
  mappingPending: 'No CGIAR Portfolio mapping started yet.',
  mappingIncompleteState: 'Mapping started, but the Science Program or Theory of Change details are still missing.',
  readyState: 'Mapping complete, waiting to be sent to PRMS.',
  sentToPrms: 'Already sent to PRMS. Nothing left to do on our side.',

  // PRMS side
  pendingReview: 'Received by PRMS, waiting for its reviewers.',
  approved: 'Accepted by PRMS. Done.',
  rejectedState: 'Returned by PRMS. Check the reason, fix the result and sync it again.',

  // Coverage by Science Program
  spHowToRead:
    'One bar per Science Program, as long as its number of results. Green = already in PRMS, grey = not in PRMS yet. The goal is all green.',
  spSynced: 'Results of this Science Program already in PRMS.',
  spNotSynced: 'Results of this Science Program not in PRMS yet.'
} as const;
