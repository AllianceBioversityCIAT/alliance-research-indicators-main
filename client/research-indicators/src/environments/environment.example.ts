// ---------------------------------------------------------------------------
// TEMPLATE — copy this file, do not edit it in place.
//
//   cp src/environments/environment.example.ts src/environments/environment.ts
//   cp src/environments/environment.example.ts src/environments/environment.dev.ts
//
// Both targets are gitignored (`.gitignore:40-41`) and neither has ever been
// committed — only `.gitkeep` is tracked in this folder. This template exists
// so a clean checkout can build at all: `ng build` (and therefore the client
// Docker image, `docker compose up --build`) reads `environment.ts` directly,
// and `npm run build-dev` file-replaces it with `environment.dev.ts`. Without
// them the build fails before it starts, and the failure names a missing module
// rather than a missing config, which is why this template is worth its lines.
//
// See `docs/infrastructure.md` §6 — Local Environment Contract.
//
// ⚠ TWO TRAPS, both of which have already cost a debugging session:
//
//  1. `hotjarId` and `hotjarVersion` MUST be NUMBERS, not strings.
//     `hotjar.service.ts` calls `Hotjar.init(environment.hotjarId,
//     environment.hotjarVersion)` and `@hotjar/browser` types both as `number`.
//     Quoting them (e.g. `hotjarId: 'test'`) fails `npm run build` outright
//     with a type error that points at the service, not at this file.
//
//  2. Keep `environment.dev.ts` in sync with this shape. It is separately
//     gitignored and separately absent on a clean checkout, so a stack that
//     builds via `npm run build` can still fail via `npm run build-dev`.
//
// Values below are inert placeholders. Replace the ones your task actually
// needs; the rest only have to be present and correctly typed for the build
// and the Jest suite to resolve `environment`.
// ---------------------------------------------------------------------------
export const environment = {
  production: false,
  dev: true,
  name: 'local',
  platform: 'STAR',

  // --- API endpoints -------------------------------------------------------
  // For the Docker Compose stack (docs/infrastructure.md §6.2) the client
  // container calls the server container through the host port mapping, so
  // this must be the HOST url, not a container name.
  mainApiUrl: 'http://localhost:3000/api',
  managementApiUrl: 'http://localhost:3000/api',
  fastResponseUrl: 'http://localhost:3000/api',

  documentOverviewUrl: '',
  fileManagerUrl: '',
  filesStorageUrl: '',
  feedbackUrl: '',
  releasesNotesApiUrl: '',
  releaseNotesDatabaseId: '',
  saveErrorsUrl: '',
  textMiningUrl: '',
  tipUrl: '',
  prmsUrl: '',
  flagsUrl: '',
  frontBaseUrl: 'http://localhost:4200',
  frontVersionKey: '',
  frontVersionUrl: '',
  s3Folder: '',
  oicrTemplateName: '',
  keyProjectOverview: '',
  keyTextMining: '',

  // --- Secrets: supply real values, never commit them ----------------------
  clarisaApiKey: '',
  clarityProjectId: '',
  cognitoClientId: '',
  cognitoDomain: '',
  cognitoIdentityProvider: '',
  cognitoRedirectUri: 'http://localhost:4200/auth',
  googleAnalyticsId: '',
  mapboxAccessToken: '',
  mapboxGeocodingUrl: '',

  // --- Numbers, not strings. See trap 1 above. -----------------------------
  hotjarId: 0,
  hotjarVersion: 0
};
