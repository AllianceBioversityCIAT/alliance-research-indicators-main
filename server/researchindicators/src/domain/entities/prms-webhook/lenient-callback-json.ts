import type { NextFunction, Request, Response } from 'express';
import { PRMS_CALLBACK_ROUTE_PREFIX } from '../../shared/utils/prms-callback.constants';

// @sdd-spec docs/specs/bilateral/prms-sync/decision-webhook — T-04 /
// NFR-PWH-005 carried gate 1. Express's JSON parser answers `{` with
// 400 before the handler runs, so T-09's MALFORMED path is never
// reached. This wraps the parsers already mounted on the application
// (main.ts mounts one before Nest init; Nest mounts another during
// init) and, only on the callback path, turns a parse failure into a
// body the handler can store.

const INSTALLED = Symbol('prmsLenientCallbackJson');

type JsonParser = ((
  req: Request,
  res: Response,
  next: NextFunction,
) => void) & { [INSTALLED]?: true };

interface RouterLayer {
  name?: string;
  handle?: JsonParser;
}

interface ExpressWithRouter {
  _router?: { stack?: RouterLayer[] };
}

/**
 * The callback path, and nothing under a longer sibling prefix.
 * `/api/prms-callbacks` must keep the strict parser.
 *
 * `PRMS_CALLBACK_ROUTE_PREFIX` is interpolated raw. It has no regex
 * metacharacters; escape it here if that ever changes.
 */
const PRMS_CALLBACK_PATH_PATTERN = new RegExp(
  `^${PRMS_CALLBACK_ROUTE_PREFIX}(?:/|$)`,
  'i',
);

export function isPrmsCallbackPath(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  const path = url.split('?')[0];
  return PRMS_CALLBACK_PATH_PATTERN.test(path);
}

function isJsonParseFailure(err: unknown): err is { body?: unknown } {
  if (typeof err !== 'object' || err === null) {
    return false;
  }
  return (err as { type?: string }).type === 'entity.parse.failed';
}

/**
 * Wrap every already-mounted `jsonParser` layer. Returns how many were
 * wrapped. Call this only after the parsers are on the stack — Nest's
 * `onModuleInit` runs after `registerParserMiddleware`.
 */
export function installLenientPrmsCallbackJsonParser(
  expressApp: object,
): number {
  const stack = (expressApp as ExpressWithRouter)._router?.stack ?? [];
  let wrapped = 0;

  for (const layer of stack) {
    const handle = layer.handle;
    if (typeof handle !== 'function' || handle[INSTALLED]) {
      continue;
    }
    if (layer.name !== 'jsonParser' && handle.name !== 'jsonParser') {
      continue;
    }

    const wrappedParser: JsonParser = function prmsCallbackAwareJsonParser(
      req,
      res,
      next,
    ) {
      const url = req.originalUrl || req.url;
      if (!isPrmsCallbackPath(url)) {
        return handle(req, res, next);
      }
      return handle(req, res, (err?: unknown) => {
        if (!err || !isJsonParseFailure(err)) {
          next(err as Parameters<NextFunction>[0]);
          return;
        }
        const raw = err.body;
        // A plain object that cannot satisfy the delivery shape, so
        // T-09 classifies MALFORMED and keeps the unparsed text.
        req.body = { raw: typeof raw === 'string' ? raw : null };
        next();
      });
    };
    wrappedParser[INSTALLED] = true;
    layer.handle = wrappedParser;
    wrapped += 1;
  }

  return wrapped;
}
