export type StarDictionaryRow = {
  section: string | null;
  field_label: string;
  explanation: string | null;
  section_fill_argb: string | null;
};

/**
 * Data dictionary sheet rows, in sheet order: the header row, then one row
 * per Raw data column, labelled with that column's header and in column
 * order (star-results-metadata.dictionary.spec.ts enforces it). Moved out of
 * the `report_data_dictionary` table so the whole workbook layout lives in
 * code; the export no longer reads that table. Section names, fills and the
 * explanations that existed were taken from the Dev table on 2026-10-16.
 *
 * A row with `section_fill_argb` starts a new fill band; rows without one
 * inherit the previous fill.
 *
 * @akili-spec docs/specs/innovation-dev/excel-export
 */
export const STAR_RESULTS_METADATA_DICTIONARY_ROWS: readonly StarDictionaryRow[] =
  [
    {
      section: 'Section',
      field_label: 'Field',
      explanation: 'Explanation',
      section_fill_argb: 'FF455A64',
    },
    {
      section: 'General Information',
      field_label: 'Result Code',
      explanation:
        'The official result code, shared by all versions of the result.',
      section_fill_argb: 'FF203C61',
    },
    {
      section: null,
      field_label: 'Source Platform',
      explanation:
        'The reporting platform where the result was registered, shown as its platform code (for example STAR).',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Public link',
      explanation:
        'A clickable link to the public PDF of the result. Reads Not available when the result has no public link.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Link to platform',
      explanation:
        "A clickable link to the result in its source platform. For STAR results it opens the result's general information page and displays STAR-<code>; reads Not available when there is no link.",
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Indicator',
      explanation: 'The indicator name the result was reported under.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Status',
      explanation:
        'The current status of the result, shown as the status name (for example Editing, Submitted or Approved).',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Title',
      explanation: 'The result title. A blank title reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Description',
      explanation:
        'The result description in free text. A blank description reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Reporting year',
      explanation:
        'The reporting year of the result, shown as a number. A missing year reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Approved versions',
      explanation:
        'The reporting years of the approved versions of this result, separated by commas. Blank when no approved version exists.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Keywords',
      explanation:
        'The result keywords, separated by commas. Optional: a result without keywords reads Not mandatory.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Creator',
      explanation:
        'The full name (first and last) of the user who created the result in the platform.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Creation date',
      explanation: 'The date the result was created, in YYYY-MM-DD format.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Main contact person',
      explanation:
        'The full name of the main contact person of the result. A missing contact reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: 'Alliance Alignment',
      field_label: 'Primary project',
      explanation:
        'The primary project of the result, shown as [agreement ID] followed by the project description. A missing primary project reads Not provided.',
      section_fill_argb: 'FF2A4783',
    },
    {
      section: null,
      field_label: 'Primary project: principal investigator',
      explanation:
        'The principal investigator (project lead) of the primary project. A missing value reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Primary project: Start date',
      explanation:
        'The start date of the primary project, in YYYY-MM-DD format. A missing date reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Primary project: End date',
      explanation:
        'The end date of the primary project, in YYYY-MM-DD format. A missing date reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Contributing projects',
      explanation:
        'One bullet line per contributing project, as [agreement ID] and project description. Optional: none reads Not mandatory.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Primary Lever / Research Area',
      explanation:
        'The short name of the primary lever or research area of the result. A missing one reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Contributing Levers / Research Areas',
      explanation:
        'The short names of the contributing levers or research areas, separated by commas. Optional: none reads Not mandatory.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Strategic Objectives',
      explanation:
        'One bullet line per strategic objective. Required on Portfolio 2 results; Not applicable on Portfolio 1.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Impact Outcomes',
      explanation:
        'One bullet line per impact outcome. Required on Portfolio 2 Policy Change, OICR and Innovation Use results; Not applicable otherwise.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Contribution to SDG targets',
      explanation:
        'One bullet line per SDG target: (lever) - target code - target text on Portfolio 1, target code - target text on Portfolio 2. Required on OICR results; Not applicable on every other indicator.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Contribution to SDG',
      explanation:
        'One bullet line per SDG the result is linked to. Required on every indicator except OICR, which reports SDG targets instead.',
      section_fill_argb: null,
    },
    {
      section: 'Partners',
      field_label: 'Partners involved',
      explanation:
        'One bullet line per partner institution, as acronym, (HQ: headquarters country) and full name. Reads Not applicable when the result is marked as having no partners; otherwise a missing list reads Not provided.',
      section_fill_argb: 'FF325B94',
    },
    {
      section: 'Geographic scope',
      field_label: 'Geographic scope',
      explanation:
        'The geographic scope catalog name chosen for the result. A missing scope reads Not provided.',
      section_fill_argb: 'FF5A91D3',
    },
    {
      section: null,
      field_label: 'Countries specified',
      explanation:
        'Comma-separated list of countries, each shown as (ISO code) and name. Required for Multi-national, National and Sub-national scopes, optional for Global, and Not applicable for Regional.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Regions specified',
      explanation:
        'Comma-separated list of region names. Required for the Regional scope, optional for Global, and Not applicable for the other scopes.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Geographic scope comments',
      explanation:
        'One bullet line per country with its sub-national areas, shown as (ISO code) country: (code) name. Required for the Sub-national scope, Not applicable for the other scopes.',
      section_fill_argb: null,
    },
    {
      section: 'Evidences',
      field_label: 'Evidences',
      explanation:
        'One bullet line per evidence, shown as the link in angle brackets, its description, and [Is public: TRUE or FALSE]. A result with no evidence reads Not provided.',
      section_fill_argb: 'FF5C7EC4',
    },
    {
      section: null,
      field_label: 'Notable references',
      explanation:
        'Notable references for the result (reference type and link). Only populated for Outcome/Impact Case Report (OICR) results.',
      section_fill_argb: null,
    },
    {
      section: 'Link to Result',
      field_label: 'Link to Result',
      explanation:
        'Results linked to this result (indicator, code, and title).',
      section_fill_argb: 'FF7E57C2',
    },
    {
      section: 'IP rights',
      field_label: 'Who owns IP rights?',
      explanation:
        'The intellectual property owner catalog name. A missing owner reads Not provided.',
      section_fill_argb: 'FF35749A',
    },
    {
      section: null,
      field_label: 'Third party',
      explanation:
        'Free-text description of the third-party IP owner. A blank value reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Legal restrictions on publication?',
      explanation:
        'Shown as [YES] or [NO], followed by the explanation when the answer is YES. A missing answer reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Commercialization potential for asset?',
      explanation:
        'Shown as [YES] or [NO], followed by the explanation when the answer is YES. A missing answer reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Does asset need refinement?',
      explanation:
        'Shown as [YES] or [NO], followed by the explanation when the answer is YES. A missing answer reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: 'CapSharing details',
      field_label: 'Training type',
      explanation:
        'The training or engagement type chosen for the result. Required on Capacity Sharing results; a missing value reads Not provided.',
      section_fill_argb: 'FF4D7C31',
    },
    {
      section: null,
      field_label: 'Training or engagement?',
      explanation:
        'Whether the activity is a training or an engagement, shown as the catalog name. Required on Capacity Sharing results; a missing value reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Length training',
      explanation:
        'The length of the training, shown as the session length catalog name. Required on Capacity Sharing results; a missing value reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Degree',
      explanation:
        'The degree level of the training, shown as the degree catalog name. Required on Capacity Sharing results; a missing value reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Total participants',
      explanation:
        'The total number of participants in a group session. Required for group sessions and Not applicable for individual ones.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Number people trained TOTAL',
      explanation:
        'The total number of people trained in a group session, the same value as Total participants. Required for group sessions and Not applicable for individual ones.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Number people trained FEMALE',
      explanation:
        'The number of female participants in a group session. Optional, and Not applicable for individual sessions.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Number people trained MALE',
      explanation:
        'The number of male participants in a group session. Optional, and Not applicable for individual sessions.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Number people trained NON BINARY',
      explanation:
        'The number of non-binary participants in a group session. Optional, and Not applicable for individual sessions.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'What was the purpose of this training/engagement?*',
      explanation:
        'The purpose of the group training or engagement, shown as the purpose catalog name. Required for group sessions and Not applicable for individual ones.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Were the trainees attending on behalf of an organization?*',
      explanation:
        'Whether the group trainees attended on behalf of an organization, shown as YES or NO. Required for group sessions and Not applicable for individual ones.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Organizations on behalf',
      explanation:
        'One bullet line per organization the group trainees attended on behalf of, shown as [id: code] acronym - (HQ: country) name. Required when the previous answer is YES; Not applicable otherwise.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Trainee affiliation',
      explanation:
        "The trainee's institution for an individual training, shown as [id: code] acronym - (HQ: location) name. A missing value reads Not provided; Not applicable for group sessions.",
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Trainee name',
      explanation:
        'The name of the trainee for an individual training. Required for individual sessions and Not applicable for group ones.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Trainee nationality',
      explanation:
        "The trainee's nationality for an individual training, shown as [ISO code] country name. A missing value reads Not provided; Not applicable for group sessions.",
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Trainee Gender',
      explanation:
        "The trainee's gender for an individual training, shown as the gender catalog name. Required for individual sessions and Not applicable for group ones.",
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Training / Engagement supervisor',
      explanation:
        'The first and last name of the training or engagement supervisor. Required on Capacity Sharing results; a missing value reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Language',
      explanation:
        'The main language of the training, shown as the CLARISA language name. A missing value reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Start date',
      explanation:
        'The start date of the training, in YYYY-MM-DD format. A missing date reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'End date',
      explanation:
        'The end date of the training, in YYYY-MM-DD format. A missing date reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Delivery modality',
      explanation:
        'How the training was delivered, shown as the delivery modality catalog name. Required on Capacity Sharing results; a missing value reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: 'Policy Change',
      field_label: 'Policy type',
      explanation:
        'The policy type catalog name. Required on Policy Change results, Not applicable on other indicators.',
      section_fill_argb: 'FFDA7842',
    },
    {
      section: null,
      field_label: 'Policy stage',
      explanation:
        'The policy stage catalog name. Required on Policy Change results, Not applicable on other indicators.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Evidence for stage',
      explanation:
        'Free-text evidence supporting the selected policy stage. Required on Policy Change results, Not applicable on other indicators.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Implementing organizations',
      explanation:
        'One bullet line per institution, shown as [id: code] acronym - (HQ: headquarters country) name. Required on Policy Change results, Not applicable on other indicators.',
      section_fill_argb: null,
    },
    {
      section: 'OICRS',
      field_label: 'MEL Regional Expert',
      explanation:
        'Full name of the MEL Regional Expert assigned to the OICR. Required on OICR results.',
      section_fill_argb: 'FFD9A041',
    },
    {
      section: null,
      field_label: 'SharePoint Folder Link',
      explanation:
        "Link to the OICR's MELP SharePoint folder, shown as a clickable link. Optional.",
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'OICR No',
      explanation:
        'Internal code that MELP assigns to the OICR. Required on OICR results.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Tagging',
      explanation:
        'The tag chosen for the OICR, shown as the tag name. Required on OICR results.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Existing OICR',
      explanation:
        'The existing OICR this case updates, shown as code - title with its link. Required when the tag is an Updated Outcome Impact Case; Not applicable otherwise.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'CGSpace link',
      explanation: 'Link to the OICR publication in CGSpace.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Maturity of change',
      explanation:
        'The maturity of change reported for the OICR, shown as the maturity level name. Required on OICR results.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Elaboration of outcome/impact statement',
      explanation:
        'Free-text description of the outcome or impact. Required on OICR results.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Short Outcome/Impact Statement',
      explanation:
        'Short version of the outcome or impact statement, up to 80 characters. Required on OICR results.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Quantification - Actual count',
      explanation:
        'Actual counts, one bullet line each as Number, Unit and Comment. Optional.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Quantification - Extrapolated estimates',
      explanation:
        'Extrapolated estimates, one bullet line each as Number, Unit and Comment. Optional.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Authors and Contact Persons',
      explanation:
        'One bullet line per author or contact person, as name, position and affiliation. Position and affiliation show N/D when unknown. Optional.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Further communication opportunities',
      explanation:
        'Whether the OICR may be considered for external-facing stories or other institutional outreach, shown as YES or NO. Optional.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Further communication opportunities description',
      explanation:
        'Free-text details of the further communication opportunities. Optional.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Impact Areas',
      explanation:
        'One bullet line per scored impact area, as area - Score: (n) score name, followed by one line per selected global target as SMO code - target. Required on OICR results.',
      section_fill_argb: null,
    },
    {
      section: 'Innovation Use',
      field_label: 'Innovation use level',
      explanation:
        'Shows the innovation use level as Level followed by the number and the level name. A missing level on an Innovation Use result reads Not provided. Any other indicator reads Not applicable.',
      section_fill_argb: 'FF6A1B9A',
    },
    {
      section: null,
      field_label: 'Use level justification',
      explanation:
        'Free-text justification of the chosen use level. Required when the level is 6 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Linked innovation development',
      explanation:
        'The linked innovation-development result, shown as platform code, official code, and title. Required on an Innovation Use result.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Actors',
      explanation:
        'One bullet line per actor type, including an optional custom name and either sex and age counts or an aggregate total.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Organizations',
      explanation:
        'One bullet line per organization, either a known institution or a type with an optional sub-type and a count.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Quantifications',
      explanation:
        'One bullet line per measure, with the number and the unit. A negative number is valid.',
      section_fill_argb: null,
    },
    {
      section: 'Innovation Development',
      field_label: 'Short title',
      explanation:
        'The innovation short title. A blank title on an Innovation Development result reads Not provided. Any other indicator reads Not applicable.',
      section_fill_argb: 'FF00897B',
    },
    {
      section: null,
      field_label: 'Innovation nature',
      explanation:
        'The innovation nature catalog name. A missing nature on an Innovation Development result reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Innovation type',
      explanation:
        'The innovation type catalog name. A missing type on an Innovation Development result reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'New or improved variety or breed',
      explanation:
        'Whether the innovation is a new or improved variety or breed, shown as Yes or No. Optional.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Number of new or improved lines/varieties',
      explanation:
        'The number of new or improved lines or varieties. Required and greater than zero only when the variety answer is Yes; otherwise Not applicable.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Innovation readiness level',
      explanation:
        'The innovation readiness level, shown as Level followed by the number and the level name. A missing level on an Innovation Development result reads Not provided.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Readiness explanation',
      explanation:
        'Free-text explanation of the chosen readiness level. Required on an Innovation Development result.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Anticipated users',
      explanation:
        'Who the innovation is anticipated to reach. Required on an Innovation Development result.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Actors',
      explanation:
        'One bullet line per actor, with the actor type, an optional custom name, and either sex and age segments or a not-applicable note. Required when anticipated users are determined.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Organizations',
      explanation:
        'One bullet line per organization, either a known institution or a type with an optional sub-type and custom name. Required when anticipated users are determined.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Intended beneficiaries/users elaborated',
      explanation:
        'Free-text description of the intended beneficiaries or users. Required when anticipated users are determined.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Expected outcomes',
      explanation:
        'Free-text description of the expected outcomes. Required when anticipated users are determined.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Potential for researchers/policymakers adaptation',
      explanation:
        'Whether the innovation has potential for adaptation by researchers or policymakers, shown as Yes or No. Required when the readiness level is 7 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Method/tool qualifies for dissemination',
      explanation:
        'The dissemination qualification. Required when knowledge sharing is Yes and the readiness level is 7 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Context for tool usefulness',
      explanation:
        'Free-text context for why the tool is useful. Required when dissemination proceeds.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Results detailed with examples',
      explanation:
        'Free-text results with examples. Required when dissemination proceeds.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Tool function',
      explanation:
        'One bullet line per tool function. At least one is required when dissemination proceeds.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Innovation used beyond original context',
      explanation:
        'Whether the innovation was used beyond its original context, shown as Yes or No. Required when dissemination proceeds.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Adopted and adapted in other contexts',
      explanation:
        'Free-text description of adoption and adaptation in other contexts. Required when used beyond the original context is Yes.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Tools often used together',
      explanation:
        'One bullet line per linked result often used with this tool. Optional.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Other tools',
      explanation: 'Free-text names of other tools. Optional.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: "Other tools' usage with this one description",
      explanation:
        'Free-text description of how other tools are used with this one. Optional.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Formulation: Is it cheaper compared to alternatives?',
      explanation:
        'The 1 to 5 answer for whether the formulation is cheaper than alternatives. Optional, and shown only when the readiness level is 7 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Formulation: Is it simpler to use?',
      explanation:
        'The 1 to 5 answer for whether the formulation is simpler to use. Optional, and shown only when the readiness level is 7 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Formulation: Does it perform better?',
      explanation:
        'The 1 to 5 answer for whether the formulation performs better. Optional, and shown only when the readiness level is 7 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label:
        'Demand and Investment: Is the innovation desirable to intended users?',
      explanation:
        'The 1 to 5 answer for whether the innovation is desirable to intended users. Optional, and shown only when the readiness level is 7 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label:
        'Demand and Investment: Is the innovation commercially viable/is there investment potential?',
      explanation:
        'The 1 to 5 answer for commercial viability or investment potential. Optional, and shown only when the readiness level is 7 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label:
        'Sustained use: Is the innovation supported by a suitable enabling environment?',
      explanation:
        'The 1 to 5 answer for whether a suitable enabling environment supports the innovation. Optional, and shown only when the readiness level is 7 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Sustained use: Is there already evidence of uptake?',
      explanation:
        'The 1 to 5 answer for whether there is already evidence of uptake. Optional, and shown only when the readiness level is 7 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label:
        'Sustained use: Is there potential for actor in new contexts and for new purposes?',
      explanation:
        'The expansion-potential catalog name. Optional, and shown only when the readiness level is 7 or higher.',
      section_fill_argb: null,
    },
    {
      section: null,
      field_label: 'Expansion and adaptation details',
      explanation:
        'Free-text expansion and adaptation details. Shown only when the readiness level is 7 or higher and expansion potential is Yes, with adaptations.',
      section_fill_argb: null,
    },
  ];
