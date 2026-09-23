/**
 * Single source for the PRMS callback route.
 *
 * `PRMS_CALLBACK_ROUTE_PREFIX` is interpolated into regular expressions
 * (path redaction and the lenient JSON parser). Do not put regex
 * metacharacters in `PRMS_CALLBACK_PATH`. If the value ever gains one,
 * escape it at each `new RegExp` site.
 */
export const PRMS_CALLBACK_PATH = 'prms-callback';
export const PRMS_CALLBACK_ROUTE_PREFIX = `/api/${PRMS_CALLBACK_PATH}`;
