import { sanitizePath } from "./helpers";
import {
  type TobspressRouterType,
  type TobspressRequestHandler,
  TobsMap,
  type TobspressRouterFn,
  TobspressRouteOptions,
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
  use(path: string, fn: TobspressRouterFn, options?: TobspressRouteOptions | undefined): TobspressRouter {
    this.attachRouter("USE", path, fn, options);
    return this;
  }

  /** Attaches a HTTP POST method router */
  post(path: string, fn: TobspressRouterFn, options?: TobspressRouteOptions | undefined): TobspressRouter {
    this.attachRouter(Method.POST, path, fn, options);
    return this;
  }

  /** Attaches a HTTP GET method router */
  get(path: string, fn: TobspressRouterFn, options?: TobspressRouteOptions | undefined): TobspressRouter {
    this.attachRouter(Method.GET, path, fn, options);
    return this;
  }

  /** Attaches a HTTP PUT method router */
  put(path: string, fn: TobspressRouterFn, options?: TobspressRouteOptions | undefined): TobspressRouter {
    this.attachRouter(Method.PUT, path, fn, options);
    return this;
  }

  /** Attaches a HTTP DELETE method router */
  delete(path: string, fn: TobspressRouterFn, options?: TobspressRouteOptions | undefined): TobspressRouter {
    this.attachRouter(Method.DELETE, path, fn, options);
    return this;
  }

  private attachRouter(
    method: Method | "USE",
    path: string,
    fn: TobspressRouterFn,
    options?: TobspressRouteOptions | undefined
  ) {
    path = sanitizePath(path);
    if (typeof fn === "function") {
      this.children.set(
        method === "USE" ? { path } : { path, method },
        new TobspressChildRouter(
          fn,
          undefined,
          [],
          options?.catchAll ?? method === "USE"
        )
      );
    } else {
      // move child routers on "/" path to the parent router
      if (path === "") {
        if (fn.router && fn.router.children) {
          for (const key of fn.router.children) {
            const child = fn.router.children.get(key)!;
            this.children.set(
              key,
              new TobspressChildRouter(
                child.handler,
                child.children,
                child.middlewares,
                child.catchAll
              )
            );
          }
        }
        this.children.set(
          method === "USE" ? { path } : { path, method },
          new TobspressChildRouter(
            fn.handler,
            undefined,
            fn.router?.middlewares
          )
        );
      } else {
        this.children.set(
          method === "USE" ? { path } : { path, method },
          new TobspressChildRouter(
            fn.handler,
            fn.router?.children,
            fn.router?.middlewares
          )
        );
      }
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
    public readonly children?: TobsMap<{ path: string; method?: Method }, TobspressRouterType>,
    public readonly middlewares: TobspressRequestHandler[] = [],
    /** Whether the router should catch child paths that are not defined */
    public readonly catchAll?: boolean
  ) {}
}
