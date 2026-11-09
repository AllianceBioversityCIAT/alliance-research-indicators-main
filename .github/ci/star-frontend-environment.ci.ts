// STAR STAGING CI: inert frontend environment for the client lint and unit tests (star-staging-ci.yml).
//
// Copied by the workflow to client/research-indicators/src/environments/environment.ts (git-ignored) before the
// tests, and removed afterwards (.github/scripts/remove-frontend-config.sh). It is NOT a deploy configuration:
//   * no real endpoint, no credential, no Secrets Manager read: the keys and the non-string values are those of the
//     versioned template client/research-indicators/src/environments/environment.example.ts;
//   * every string is NON-EMPTY, as in the real configuration: URLs point to the reserved `.invalid` domain (never
//     resolves) and identifiers are `ci-<key>`. Empty strings change the code path (e.g. version-selector calls
//     window.open only when environment.prmsUrl / tipUrl are non-empty, and its specs expect that call);
//   * plus `webSocketServerUrl`, read by the client (room.component.spec.ts) but absent from the template;
//   * production: false and localAuthBypass: false.
// Jest compiles with isolatedModules (no type check), so the tests need these keys to exist with real-shaped values.
// Keep it in sync with the keys the client reads (`environment.<key>`).
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
  webSocketServerUrl: 'http://localhost:3000',

  documentOverviewUrl: 'https://document-overview.ci.invalid/',
  fileManagerUrl: 'https://file-manager.ci.invalid/',
  filesStorageUrl: 'https://files-storage.ci.invalid/',
  feedbackUrl: 'https://feedback.ci.invalid/',
  releasesNotesApiUrl: 'https://releases-notes-api.ci.invalid/',
  releaseNotesDatabaseId: 'ci-release-notes-database-id',
  saveErrorsUrl: 'https://save-errors.ci.invalid/',
  textMiningUrl: 'https://text-mining.ci.invalid/',
  tipUrl: 'https://tip.ci.invalid/',
  prmsUrl: 'https://prms.ci.invalid/',
  flagsUrl: 'https://flags.ci.invalid/',
  frontBaseUrl: 'http://localhost:4200',
  frontVersionKey: 'ci-front-version-key',
  frontVersionUrl: 'https://front-version.ci.invalid/',
  s3Folder: 'ci-s3-folder',
  oicrTemplateName: 'ci-oicr-template-name',
  keyProjectOverview: 'ci-key-project-overview',
  keyTextMining: 'ci-key-text-mining',

  // --- Secret-shaped keys: inert CI values only, never real secrets ---------
  clarisaApiKey: 'ci-clarisa-api-key',
  clarityProjectId: 'ci-clarity-project-id',
  cognitoClientId: 'ci-cognito-client-id',
  cognitoDomain: 'https://cognito-domain.ci.invalid/',
  cognitoIdentityProvider: 'ci-cognito-identity-provider',
  cognitoRedirectUri: 'http://localhost:4200/auth',
  googleAnalyticsId: 'ci-google-analytics-id',
  mapboxAccessToken: 'ci-mapbox-access-token',
  mapboxGeocodingUrl: 'https://mapbox-geocoding.ci.invalid',

  // --- Numbers, not strings. See trap 1 above. -----------------------------
  hotjarId: 0,
  hotjarVersion: 0,

  // --- Local auth bypass ---------------------------------------------------
  // Client-side counterpart to the server's ARI_LOCAL_AUTH_BYPASS. The two are
  // INDEPENDENT: the server flag only skips JWT validation on requests, while
  // rolesGuard gates navigation on cache.isLoggedIn(). With the server flag on
  // and this off, the app still redirects to /login and dies at Cognito.
  //
  // Set to `true` in your local environment.ts when running the Docker stack
  // without real Cognito credentials. MUST remain `false` in environment.dev.ts
  // and in any file feeding a deployed build. Guarded at the use site by
  // `environment.production === false` — see shared/auth/local-auth-bypass.ts.
  localAuthBypass: false
};
