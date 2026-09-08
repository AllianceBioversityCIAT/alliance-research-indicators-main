// @sdd-spec docs/specs/bilateral/primary-contributing-sp — T-08 / D-C2-14
//
// Single source of truth for the SP role literal union. Before this file,
// the literal was duplicated by convention rather than by type: once as the
// derivation at `bilateral.service.ts` (`spCode === primarySpCode ?
// 'PRIMARY' : 'CONTRIBUTING'`, T-06) and once as `SelectedScienceProgramResponse
// .role`'s TS type (`update-pool-funding-alignment.dto.ts`, T-03). Both sites,
// plus the read-back carrier (`PoolFundingAlignmentDetail.sp_roles`, T-08)
// and the future audit payload (T-10), now reference this one export so they
// agree by type rather than by convention.
export type SpRole = 'PRIMARY' | 'CONTRIBUTING';
