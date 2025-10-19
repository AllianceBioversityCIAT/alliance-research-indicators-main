export enum ClarisaPathEnum {
  COUNTRIES = 'api/countries',
  GEO_SCOPES = 'api/geographic-scopes',
  INSTITUTIONS_TYPES = 'api/institution-types/simple',
  INSTITUTIONS = 'api/institutions',
  LANGUAGES = 'api/languages',
  REGIONS = 'api/regions/un-regions',
  LEVERS = 'api/alliance-levers',
  SUB_NATIONAL = 'api/subnational-scope',
  OS_COUNTRIES = 'integration/open-search/countries/search',
  OS_INSTITUTIONS = 'integration/open-search/institutions/search',
  OS_SUBNATIONAL = 'integration/open-search/subnational/search',
  PARTNER_REQUEST_CREATE = 'api/partner-requests/create',
  CREATE_SECRET = 'api/app-secrets/create',
  VALIDATE_SECRET = 'api/app-secrets/validate',
  SDG = 'api/sdgs',
  IMPACT_AREAS = 'api/impact-areas',
}

export enum SearchToOpenSearchEnum {
  COUNTRY = 'countries',
  INSTITUTION = 'institutions',
  SUBNATIONAL = 'subnational',
}
