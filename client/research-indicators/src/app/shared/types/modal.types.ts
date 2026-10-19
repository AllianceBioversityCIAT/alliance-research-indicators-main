export type ModalName =
  | 'createResult'
  | 'submitResult'
  | 'requestPartner'
  | 'askForHelp'
  | 'createOicrResult'
  | 'resultInformation'
  | 'addContactPerson'
  | 'selectLinkedResults'
  | 'editEnvironmentVariable'
  | 'editPrompt'
  | 'projectGroundingSetup'
  | 'portfolioManagement'
  | 'assignPiDelegate'
  | 'piDelegateHistory'
  // @akili-spec changes/profile-simulation — R-IMP-007, design §2.2/§6
  | 'simulateProfile'
  | 'portfolio2025LeverSdgs'
  | 'portfolio2026SdgTargets'
  | 'poolFundingHelp'
  // @akili-spec institutional-performance/control-lists — T-01: category mode only;
  // the mode switch stays extensible for list/value modes in T-02/T-03.
  | 'controlListForm'
  // @akili-spec institutional-performance/organizational-structure — T-03: inactivate / reactivate / delete dialog.
  | 'orgUnitLifecycle';
