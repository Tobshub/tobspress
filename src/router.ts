import { sanitizePath } from "./helpers";
import {
  type TobspressRouterType,
  type TobspressRequestHandler,
  TobsMap,
  type TobspressRouterFn,
} from "./types";
import { Method } from "./http";

/** Router to handle HTTP requests */
export class TobspressRouter implements TobspressRouterType {
  children: TobsMap<{ path: string; method?: Method }, TobspressRouterType>;
  middlewares: TobspressRequestHandler[];
  constructor() {
    this.children = new TobsMap();
    this.middlewares = [];
  }

  /** Attaches a non-method specific router */
  use(path: string, fn: TobspressRouterFn): TobspressRouter {
    this.attachRouter("USE", path, fn);
    return this;
  }

  /** Attaches a HTTP GET method router */
  get(path: string, fn: TobspressRouterFn): TobspressRouter {
    this.attachRouter(Method.GET, path, fn);
    return this;
  }

  /** Attaches a HTTP POST method router */
  post(path: string, fn: TobspressRouterFn): TobspressRouter {
    this.attachRouter(Method.POST, path, fn);
    return this;
  }

  /** Attaches a HTTP PUT method router */
  put(path: string, fn: TobspressRouterFn): TobspressRouter {
    this.attachRouter(Method.PUT, path, fn);
    return this;
  }

  /** Attaches a HTTP DELETE method router */
  delete(path: string, fn: TobspressRouterFn): TobspressRouter {
    this.attachRouter(Method.DELETE, path, fn);
    return this;
  }

  private attachRouter(
    method: Method | "USE",
    path: string,
    fn: TobspressRouterFn
  ) {
    if (typeof fn === "function") {
      this.children.set(
        method === "USE"
          ? { path: sanitizePath(path) }
          : { path: sanitizePath(path), method },
        new TobspressChildRouter(fn, undefined, [], method === "USE")
      );
    } else {
      this.children.set(
        method === "USE"
          ? { path: sanitizePath(path) }
          : { path: sanitizePath(path), method },
        new TobspressChildRouter(
          fn.handler,
          fn.router?.children,
          fn.router?.middlewares,
          method === "USE"
        )
      );
    }
  }

  attach(middlewares: TobspressRequestHandler[]) {
    this.middlewares.push(...middlewares);
  }
}

/** Router interface that is initialized with its handlers and children */
export class TobspressChildRouter implements TobspressRouterType {
  constructor(
    public readonly handler?: TobspressRequestHandler,
    public readonly children?: TobsMap<
      { path: string; method?: Method },
      TobspressRouterType
    >,
    public readonly middlewares: TobspressRequestHandler[] = [],
    /** Whether the router should catch child paths that are not defined */
    public readonly catchAll?: boolean
  ) {}
}
