export class ENV {
  static get IS_PRODUCTION(): boolean {
    return ENV.validateEnvBoolean(process.env.ARI_IS_PRODUCTION);
  }
  static get SEE_ALL_LOGS(): boolean {
    return ENV.validateEnvBoolean(process.env.ARI_SEE_ALL_LOGS);
  }

  static get BILATERAL_MODULE_ENABLED(): boolean {
    return ENV.validateEnvBoolean(process.env.ARI_BILATERAL_MODULE_ENABLED);
  }

  static get BILATERAL_PUSH_ENABLED(): boolean {
    return ENV.validateEnvBoolean(process.env.ARI_BILATERAL_PUSH_ENABLED);
  }

  static get BILATERAL_W3_SYNC_ENABLED(): boolean {
    return ENV.validateEnvBoolean(process.env.ARI_BILATERAL_W3_SYNC_ENABLED);
  }

  static get BILATERAL_SP_TOC_SYNC_ENABLED(): boolean {
    return ENV.validateEnvBoolean(
      process.env.ARI_BILATERAL_SP_TOC_SYNC_ENABLED,
    );
  }

  /**
   * @sdd-spec bilateral-module/pending-items — T-15.11 / R-BIL-076
   *
   * Active CGIAR portfolio used to filter CLARISA project_mappings_array[]
   * when computing the SP picker source per result. Default `P25` matches
   * the current 2025-2030 portfolio.
   */
  static get BILATERAL_ACTIVE_PORTFOLIO(): string {
    return process.env.ARI_BILATERAL_ACTIVE_PORTFOLIO?.trim() || 'P25';
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
