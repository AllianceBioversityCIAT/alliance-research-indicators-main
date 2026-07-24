export interface BrowserInfo {
  name: string;
  fullVersion: string;
  majorVersion: number;
}

function extractBrowserInfo(nAgt: string): { browserName: string; fullVersion: string } {
  let browserName = 'Unknown';
  let fullVersion = '';
  let verOffset: number, nameOffset: number;

  // In Opera, the true version is after "OPR" or after "Version"
  if ((verOffset = nAgt.indexOf('OPR')) != -1) {
    browserName = 'Opera';
    fullVersion = nAgt.substring(verOffset + 4);
    if ((verOffset = nAgt.indexOf('Version')) != -1) fullVersion = nAgt.substring(verOffset + 8);
  }
  // In MS Edge, the true version is after "Edg" in userAgent
  else if ((verOffset = nAgt.indexOf('Edg')) != -1) {
    browserName = 'Microsoft Edge';
    fullVersion = nAgt.substring(verOffset + 4);
  }
  // In MSIE, the true version is after "MSIE" in userAgent
  else if ((verOffset = nAgt.indexOf('MSIE')) != -1) {
    browserName = 'Microsoft Internet Explorer';
    fullVersion = nAgt.substring(verOffset + 5);
  }
  // In Chrome, the true version is after "Chrome"
  else if ((verOffset = nAgt.indexOf('Chrome')) != -1) {
    browserName = 'Chrome';
    fullVersion = nAgt.substring(verOffset + 7);
  }
  // In Safari, the true version is after "Safari" or after "Version"
  else if ((verOffset = nAgt.indexOf('Safari')) != -1) {
    browserName = 'Safari';
    fullVersion = nAgt.substring(verOffset + 7);
    if ((verOffset = nAgt.indexOf('Version')) != -1) fullVersion = nAgt.substring(verOffset + 8);
  }
  // In Firefox, the true version is after "Firefox"
  else if ((verOffset = nAgt.indexOf('Firefox')) != -1) {
    browserName = 'Firefox';
    fullVersion = nAgt.substring(verOffset + 8);
  }
  // In most other browsers, "name/version" is at the end of userAgent
  else if ((nameOffset = nAgt.lastIndexOf(' ') + 1) < (verOffset = nAgt.lastIndexOf('/'))) {
    browserName = nAgt.substring(nameOffset, verOffset);
    fullVersion = nAgt.substring(verOffset + 1);
    if (browserName.toLowerCase() == browserName.toUpperCase()) {
      browserName = 'Unknown';
    }
  }

  return { browserName, fullVersion };
}

export function getBrowserInfo(): BrowserInfo {
  const nAgt = navigator.userAgent;
  const { browserName, fullVersion } = extractBrowserInfo(nAgt);
  let majorVersion = parseInt(fullVersion, 10);
  let ix: number;

  // trim the fullVersion string at semicolon/space if present
  let trimmedVersion = fullVersion;
  if ((ix = trimmedVersion.indexOf(';')) != -1) trimmedVersion = trimmedVersion.substring(0, ix);
  if ((ix = trimmedVersion.indexOf(' ')) != -1) trimmedVersion = trimmedVersion.substring(0, ix);

  majorVersion = parseInt(trimmedVersion, 10);
  if (isNaN(majorVersion)) {
    trimmedVersion = nAgt.split(' ')[0];
    majorVersion = parseInt(trimmedVersion, 10) || 0;
  }

  return {
    name: browserName,
    fullVersion: trimmedVersion,
    majorVersion
  };
}
