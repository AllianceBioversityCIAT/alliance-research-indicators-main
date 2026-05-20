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

  private static validateEnvBoolean(pv: string): boolean {
    return pv == 'true';
  }
}
