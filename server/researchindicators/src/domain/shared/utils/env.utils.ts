export class ENV {
  static get IS_PRODUCTION(): boolean {
    return ENV.validateEnvBoolean(process.env.ARI_IS_PRODUCTION);
  }
  static get SEE_ALL_LOGS(): boolean {
    return ENV.validateEnvBoolean(process.env.ARI_SEE_ALL_LOGS);
  }

  /**
   * LOCAL DEVELOPMENT ONLY: skip JWT validation and inject a mock SYSTEM_ADMIN user.
   *
   * Purpose: lets a developer hit the API from their machine without setting up a
   * ROAR token or a local `app_secret` row. Eliminates the "Unknown token error"
   * 401 when the dev/prod token doesn't validate against the local backend.
   *
   * SAFETY:
   * - Defaults to false. Only honored when env var is the literal string "true".
   * - Double-guarded: also requires IS_PRODUCTION to be false. Even if someone
   *   accidentally sets ARI_LOCAL_AUTH_BYPASS=true in dev/staging/prod .env,
   *   this getter returns false there.
   * - JwtMiddleware logs a warning on every request when the bypass is active.
   * - MUST NOT appear in any .env file that ships to a deployed environment.
   *
   * If you ever see this enabled outside a developer laptop, treat it as a
   * security incident.
   */
  static get LOCAL_AUTH_BYPASS(): boolean {
    return (
      ENV.validateEnvBoolean(process.env.ARI_LOCAL_AUTH_BYPASS) &&
      !ENV.IS_PRODUCTION
    );
  }

  private static validateEnvBoolean(pv: string): boolean {
    return pv == 'true';
  }
}
