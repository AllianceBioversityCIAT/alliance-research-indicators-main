import { AcronymExContractEnum } from '../../open-search/prms/enum/rsult-type.enum';

type ExContractAcronym =
  (typeof AcronymExContractEnum)[keyof typeof AcronymExContractEnum];

export const CenterHomologation: Record<ExContractAcronym, number> = {
  [AcronymExContractEnum['ABC RH']]: 46,
  [AcronymExContractEnum.ABC]: 49,
};

/**
 * Maps an AGRESSO contract centre to its CLARISA institution id, preserving
 * the inbound contract acronym normalization.
 */
export function homologateCenter(
  ubwClientDescription: string,
): number | undefined {
  return CenterHomologation[
    ubwClientDescription.toUpperCase().trim() as ExContractAcronym
  ];
}
