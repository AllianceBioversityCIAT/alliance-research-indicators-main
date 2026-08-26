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
  | 'projectGroundingSetup'
  | 'portfolioManagement'
  // @akili-spec changes/profile-simulation — R-IMP-007, design §2.2/§6
  | 'simulateProfile';
