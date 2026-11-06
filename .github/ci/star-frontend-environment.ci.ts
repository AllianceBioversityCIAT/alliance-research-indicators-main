// STAR STAGING CI: inert frontend environment for the client lint and unit tests (star-staging-ci.yml).
//
// Copied by the workflow to client/research-indicators/src/environments/environment.ts (git-ignored) before the
// tests, and removed afterwards (.github/scripts/remove-frontend-config.sh). It is NOT a deploy configuration:
//   * no real endpoint, no credential, no Secrets Manager read: every value is the inert placeholder of the versioned
//     template client/research-indicators/src/environments/environment.example.ts;
//   * plus `webSocketServerUrl`, read by the client (room.component.spec.ts) but absent from the template;
//   * production: false and localAuthBypass: false.
// Jest compiles with isolatedModules (no type check), so the tests only need these keys to exist.
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
