/**
 * PRMS `innovation_use_summary` actor type names -> STAR `clarisa_actor_types.code`.
 *
 * The PRMS search API sends only the name, and two of them do not match the
 * STAR catalog: "Farmers/ (agro)pastoralist/ herders/ fishers" is spaced
 * differently and "Agricultural extension agents" is "Extension agents" in
 * STAR. Keys are normalised with {@link normalizePrmsActorTypeName}.
 */
export const InnovationUseActorTypeHomologation: Record<string, number> = {
  'farmers/(agro)pastoralist/herders/fishers': 1,
  researchers: 2,
  agriculturalextensionagents: 3,
  extensionagents: 3,
  'policyactors(publicorprivate)': 4,
  other: 5,
};

export const normalizePrmsActorTypeName = (name?: string | null): string =>
  (name ?? '').replace(/\s+/g, '').toLowerCase();

export const homologateInnovationUseActorType = (
  name?: string | null,
): number | undefined =>
  InnovationUseActorTypeHomologation[normalizePrmsActorTypeName(name)];
