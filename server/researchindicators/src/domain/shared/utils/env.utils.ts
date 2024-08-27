export class ENV {
  static get IS_PRODUCTION(): boolean {
    return ENV.validateEnvBoolean(process.env.ARI_IS_PRODUCTION);
  }
  static get SEE_ALL_LOGS(): boolean {
    return ENV.validateEnvBoolean(process.env.ARI_SEE_ALL_LOGS);
  }

  private static validateEnvBoolean(pv: string): boolean {
    return pv == 'true';
  }
}
