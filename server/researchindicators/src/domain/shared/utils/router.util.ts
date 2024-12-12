import { Router } from 'express';

/**
 *
 * @param router
 * @param search
 * @returns
 * @description This method is used to search the path of a route.
 * It receives the router and the search string.
 * It returns the path of the route.
 * It uses the stack of the router to find the route.
 * It uses the regexp of the layer to test the url.
 * **Note:** The routes can be found in `req.app._router`.
 */
export const searchPaternPath = (router: Router, search: string) => {
  const rootRegex: string = '/^\\/(.*)\\/?$/i';
  const matchedRoute = router.stack.find(
    (layer) =>
      `${layer.regexp}` != rootRegex &&
      layer.regexp.test(search) &&
      layer?.route?.path,
  );

  return matchedRoute;
};
