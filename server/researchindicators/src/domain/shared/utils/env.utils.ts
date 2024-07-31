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

  static get EXPIRE_DATE(): Date {
    const regexTimer: RegExp = /^(\d+)([wdhm])$/;
    const expire: string = process.env.ARI_JWT_REFRESH_EXPIRES_IN;
    const expireMatchs: string[] = regexTimer.exec(expire);
    let timeExtra: number = 0;
    switch (expireMatchs[2].toLowerCase().trim()) {
      case 'm':
        timeExtra = 60000;
        break;
      case 'h':
        timeExtra = 3600000;
        break;
      case 'd':
        timeExtra = 86400000;
        break;
      case 'w':
        timeExtra = 604800000;
        break;
    }
    return new Date(Date.now() + parseInt(expireMatchs[1]) * timeExtra);
  }
}
