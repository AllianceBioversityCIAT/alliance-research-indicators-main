export const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/['"`;\\]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/\bUNION\b/gi, '')
    .replace(/\bSELECT\b/gi, '')
    .replace(/\bINSERT\b/gi, '')
    .replace(/\bUPDATE\b/gi, '')
    .replace(/\bDELETE\b/gi, '')
    .replace(/\bDROP\b/gi, '')
    .replace(/\bCREATE\b/gi, '')
    .replace(/\bALTER\b/gi, '')
    .replace(/\bEXEC\b/gi, '')
    .replace(/\bEXECUTE\b/gi, '')
    .trim();
};

export const isValidText = (text: string): boolean => {
  if (!text || typeof text !== 'string') return true;

  const maliciousPatterns = [
    /['"`;\\]/,
    /--/,
    /\/\*|\*\//,
    /\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/gi,
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];

  return !maliciousPatterns.some((pattern) => pattern.test(text));
};

export const escapeLikeString = (text: string): string => {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
};
