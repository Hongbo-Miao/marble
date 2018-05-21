import * as pathToRegexp from 'path-to-regexp';
import { Observable } from 'rxjs';
import { filter, tap } from 'rxjs/operators';
import { HttpRequest, HttpRoute, RouteParameters } from '../http.interface';
import { queryParams } from "./queryParamsFactory/queryParams.factory";
import { urlParams } from "./urlParamsFactory/urlParams.factory";

type MatcherOpts = {
  suffix?: string,
  combiner?: boolean,
};

const removeTrailingSlash = (path: string): string =>
  path.replace(/\/$/, '');

const removeQueryParams = (path: string): string =>
  path.split('?')[0];

const pathFactory = (matchers: string[], path: string, suffix?: string): string =>
  removeTrailingSlash(
    matchers.reduce((prev, cur) => prev + cur, '')
    + path + (suffix || '')
  );

const urlFactory = (path: string): string =>
  removeQueryParams(path);

const routeFactory = (req: HttpRequest, path: string): HttpRoute => {
  const match = pathFactory(req.matchers!, path);
  const url = urlFactory(req.url!);
  const params = pathToRegexp(match).exec(url);
  const routes = pathToRegexp.parse(match);

  return {
    url,
    params: urlParams(params, routes),
    queryParams: queryParams(req.url!)
  };
};

export const matchPath = (path: string, opts: MatcherOpts = {}) => (source$: Observable<HttpRequest>) =>
  source$.pipe(
    tap(req => req.matchers = req.matchers || []),
    filter(req => {
      const match = pathFactory(req.matchers!, path, opts.suffix);
      const url = urlFactory(req.url!);
      return pathToRegexp(match).test(url);
    }),
    tap(req => req.route = {
      ...req.route,
      ...routeFactory(req, path),
    }),
    tap(req => opts.combiner && req.matchers!.push(path))
  );
