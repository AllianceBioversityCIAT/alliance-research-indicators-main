import { Injectable } from '@nestjs/common';
import { ClarisaGeoScopeEnum } from '../../clarisa/entities/clarisa-geo-scope/enum/clarisa-geo-scope.enum';
import {
  PrmsSyncAggregate,
  PrmsStaffSnapshot,
} from '../dto/prms-sync-aggregate';
import { homologateCenter } from '../homologation/center.homologation';

/**
 * Build failure for a missing or invalid common-field mapping.
 * `field` is the PRMS payload key the caller should name in REFUSED_BY_STAR.
 */
export class PrmsPayloadBuildError extends Error {
  constructor(
    message: string,
    public readonly field: string,
  ) {
    super(message);
    this.name = 'PrmsPayloadBuildError';
  }
}

/**
 * Centre catalogue transcribed from homologation.md §1.3 (D-7).
 * En-dash in `name` is U+2013, matching the homologation table verbatim.
 */
const CENTER_CATALOGUE: Record<
  number,
  { institution_id: number; acronym: string; name: string }
> = {
  46: {
    institution_id: 46,
    acronym: 'ABC RH - CIAT (Alliance)',
    name: 'Alliance of Bioversity and CIAT \u2013 Regional Hub (International Center for Tropical Agriculture / Centro Internacional de Agricultura Tropical)',
  },
  49: {
    institution_id: 49,
    acronym: 'ABC - Bioversity (Alliance)',
    name: 'Alliance of Bioversity and CIAT \u2013 Headquarter (Bioversity International)',
  },
};

/**
 * PRMS-allowed `geo_focus.scope_label` values, transcribed from
 * homologation.md §4.3 (T-01 spike allowed-values list). Scope 50 must be
 * exactly "This is yet to be determined" — not "To be determined".
 */
const SCOPE_LABELS: Record<number, string> = {
  [ClarisaGeoScopeEnum.GLOBAL]: 'Global',
  [ClarisaGeoScopeEnum.REGIONAL]: 'Regional',
  [ClarisaGeoScopeEnum.MULTI_NATIONAL]: 'Multi-national',
  [ClarisaGeoScopeEnum.NATIONAL]: 'National',
  [ClarisaGeoScopeEnum.SUB_NATIONAL]: 'Sub-national',
  [ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED]:
    'This is yet to be determined',
};

/**
 * Arithmetic over values a user actually entered — permitted by P-1
 * (homologation.md §1.4, §8.3; R-PRMS-008 AC.2).
 * `women` = `women_youth_count` + `women_not_youth_count`.
 */
export function sumUserEnteredCounts(
  youthCount: number,
  notYouthCount: number,
): number {
  return youthCount + notYouthCount;
}

const formatStaffName = (staff: PrmsStaffSnapshot): string =>
  `${staff.first_name} ${staff.last_name}`.trim();

const requirePresent = (
  value: string | null | undefined,
  field: string,
): string => {
  if (value == null || String(value).trim() === '') {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field '${field}'`,
      field,
    );
  }
  return value;
};

const requireStaff = (
  staff: PrmsStaffSnapshot | null | undefined,
  field: string,
): { email: string; name: string } => {
  if (!staff) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field '${field}'`,
      field,
    );
  }
  const email = requirePresent(staff.email, field);
  const name = requirePresent(formatStaffName(staff), field);
  return { email, name };
};

const resolveCenter = (
  contract: PrmsSyncAggregate['primary_contract'],
): { institution_id: number; acronym: string; name: string } => {
  if (!contract?.ubwClientDescription) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field 'lead_center'`,
      'lead_center',
    );
  }
  const institutionId = homologateCenter(contract.ubwClientDescription);
  if (institutionId == null) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field 'lead_center'`,
      'lead_center',
    );
  }
  const center = CENTER_CATALOGUE[institutionId];
  if (!center) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field 'lead_center'`,
      'lead_center',
    );
  }
  return center;
};

const composeGrantTitle = (
  agreementId: string | null | undefined,
  description: string | null | undefined,
): string => {
  const id = agreementId?.trim() ?? '';
  if (!id) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field 'grant_title'`,
      'grant_title',
    );
  }
  const desc = description?.trim() ?? '';
  return desc ? `${id}-${desc}` : id;
};

const buildTocMapping = (
  aggregate: PrmsSyncAggregate,
): Record<string, unknown> => {
  const primary = aggregate.science_programs.find(
    (program) => program.sp_role === 'PRIMARY',
  );
  if (!primary) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field 'toc_mapping': alignment has no PRIMARY science program`,
      'toc_mapping',
    );
  }
  const toc: Record<string, unknown> = {
    science_program_id: requirePresent(
      primary.sp_code,
      'toc_mapping.science_program_id',
    ),
  };
  if (primary.toc_result_title) {
    toc.result_title = primary.toc_result_title;
  }
  if (primary.indicator_description) {
    toc.result_indicator_description = primary.indicator_description;
  }
  return toc;
};

const buildContributingPrograms = (
  aggregate: PrmsSyncAggregate,
): Record<string, unknown>[] =>
  aggregate.science_programs
    .filter((program) => program.sp_role === 'CONTRIBUTING')
    .map((program) => {
      const entry: Record<string, unknown> = {
        science_program_id: requirePresent(
          program.sp_code,
          'contributing_programs.science_program_id',
        ),
      };
      if (program.toc_result_title) {
        entry.result_title = program.toc_result_title;
      }
      if (program.indicator_description) {
        entry.result_indicator_description = program.indicator_description;
      }
      return entry;
    });

const mapRegions = (aggregate: PrmsSyncAggregate) =>
  aggregate.regions.map((region) => ({
    um49code: region.um49code,
    name: region.name,
  }));

const mapCountries = (aggregate: PrmsSyncAggregate) =>
  aggregate.countries.map((country) => ({
    id: country.id,
    name: country.name,
    iso_alpha_3: country.iso_alpha_3,
    iso_alpha_2: country.iso_alpha_2,
  }));

const mapSubnationals = (aggregate: PrmsSyncAggregate) =>
  aggregate.subnational_areas.map((area) => ({
    id: area.id,
    name: area.name,
  }));

const buildGeoFocus = (
  aggregate: PrmsSyncAggregate,
): Record<string, unknown> => {
  if (aggregate.geo_scope_id == null) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field 'geo_focus'`,
      'geo_focus',
    );
  }
  const scopeCode = Number(aggregate.geo_scope_id);
  const scopeLabel = SCOPE_LABELS[scopeCode];
  if (!scopeLabel) {
    throw new PrmsPayloadBuildError(
      `Missing mandatory field 'geo_focus'`,
      'geo_focus',
    );
  }

  const geo: Record<string, unknown> = {
    scope_code: scopeCode,
    scope_label: scopeLabel,
  };

  // 2026-09-21 -- the five CARDINALITY refusals that used to live in this switch
  // were removed (>=1 region, >=2 countries, >=1 country, >=1 country + >=1
  // sub-national, and "global must not carry companions").
  //
  // None of them came from a contract PRMS confirmed; they were STAR's guesses at
  // what PRMS would demand, and because they threw `PrmsPayloadBuildError` the
  // send was refused locally -- so PRMS never saw the payload and the guesses
  // could never be checked. The first one to be exercised for real
  // ("scope 3 (Multi-national) requires at least 2 countries") blocked a result
  // whose data STAR itself considers complete.
  //
  // Only the STRUCTURAL check survives, above: without a resolvable scope there is
  // no `scope_code` / `scope_label` to emit at all.
  //
  // Collections are attached when present and OMITTED when empty -- not sent as
  // `[]`, which would assert "we checked and there are none" rather than "we are
  // not declaring this". Same rule as the Innovation Use builder.
  const attachIfAny = (key: string, values: unknown[]): void => {
    if (values.length > 0) {
      geo[key] = values;
    }
  };

  switch (scopeCode) {
    case ClarisaGeoScopeEnum.GLOBAL:
    case ClarisaGeoScopeEnum.THIS_IS_YET_TO_BE_DETERMINED:
      // Companion geography is not emitted for these scopes -- that is the shape
      // the payload has always had. What changed is that carrying some no longer
      // REFUSES the send.
      return geo;
    case ClarisaGeoScopeEnum.REGIONAL:
      attachIfAny('regions', mapRegions(aggregate));
      return geo;
    case ClarisaGeoScopeEnum.MULTI_NATIONAL:
    case ClarisaGeoScopeEnum.NATIONAL:
      attachIfAny('countries', mapCountries(aggregate));
      return geo;
    case ClarisaGeoScopeEnum.SUB_NATIONAL:
      attachIfAny('countries', mapCountries(aggregate));
      attachIfAny('subnational_areas', mapSubnationals(aggregate));
      return geo;
    default:
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'geo_focus'`,
        'geo_focus',
      );
  }
};

@Injectable()
export class CommonFieldsBuilder {
  /**
   * Maps the already-loaded aggregate to the flat common `data` block
   * (homologation.md §4). Type-specific nesting is T-07/T-08/T-09.
   */
  build(aggregate: PrmsSyncAggregate): Record<string, unknown> {
    const leadCenter = resolveCenter(aggregate.primary_contract);
    const createdBy = requireStaff(aggregate.created_by, 'created_by');
    if (!aggregate.submitted_by) {
      throw new PrmsPayloadBuildError(
        `Missing mandatory field 'submitted_by'`,
        'submitted_by',
      );
    }
    const submittedStaff = requireStaff(
      aggregate.submitted_by.staff,
      'submitted_by',
    );

    const data: Record<string, unknown> = {
      external_reference: String(
        requirePresent(
          aggregate.result_official_code == null
            ? null
            : String(aggregate.result_official_code),
          'external_reference',
        ),
      ),
      keep_editing: false,
      created_date: (aggregate.created_at instanceof Date
        ? aggregate.created_at
        : new Date(aggregate.created_at)
      ).toISOString(),
      created_by: createdBy,
      submitted_by: {
        email: submittedStaff.email,
        name: submittedStaff.name,
        submitted_date: (aggregate.submitted_by.submitted_date instanceof Date
          ? aggregate.submitted_by.submitted_date
          : new Date(aggregate.submitted_by.submitted_date)
        ).toISOString(),
      },
      lead_contact_person: requireStaff(
        aggregate.lead_contact,
        'lead_contact_person',
      ),

      lead_center: leadCenter,
      title: requirePresent(aggregate.title, 'title'),
      description: requirePresent(aggregate.description, 'description'),
      toc_mapping: buildTocMapping(aggregate),
      geo_focus: buildGeoFocus(aggregate),
      contributing_center: [leadCenter],
    };

    if (aggregate.submitted_by.comment) {
      (data.submitted_by as Record<string, unknown>).comment =
        aggregate.submitted_by.comment;
    }

    const contributingPrograms = buildContributingPrograms(aggregate);
    if (contributingPrograms.length > 0) {
      data.contributing_programs = contributingPrograms;
    }

    if (
      aggregate.is_partner_not_applicable !== true &&
      aggregate.partners.length > 0
    ) {
      data.contributing_partners = aggregate.partners.map((partner) => ({
        institution_id: partner.institution_id,
        acronym: partner.acronym,
        name: partner.name,
      }));
    }

    const publicEvidence = aggregate.evidence.filter(
      (item) => item.is_private !== true,
    );
    if (publicEvidence.length > 0) {
      data.evidence = publicEvidence.map((item) => {
        const entry: Record<string, unknown> = {
          link: requirePresent(item.link, 'evidence.link'),
        };
        if (item.description) {
          entry.description = item.description;
        }
        return entry;
      });
    }

    if (aggregate.contracts.length > 0) {
      data.contributing_bilateral_projects = aggregate.contracts.map(
        (contract) => ({
          grant_title: composeGrantTitle(
            contract.agreement_id,
            contract.description,
          ),
          is_lead: contract.is_primary === true,
        }),
      );
    }

    return data;
  }
}
