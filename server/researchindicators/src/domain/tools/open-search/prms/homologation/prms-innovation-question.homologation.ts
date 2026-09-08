/**
 * PRMS `innovation_development_questionnaire.intellectual_property_rights`
 * question_id → STAR IP Rights semantics.
 *
 * Only 101 and 102 are mapped; 103 (IP expert support) and 138 (already
 * involved) are intentionally excluded (no STAR field / conflicts with 101).
 */
export enum PrmsInnovationIpQuestionEnum {
  PRIVATE_SECTOR_ENGAGEMENT = 101,
  FORMAL_IP_RIGHTS_APPLICATION = 102,
}
