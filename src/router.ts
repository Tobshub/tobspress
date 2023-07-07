import { sanitizePath } from "./helpers";
import {
  type TobspressRouterType,
  type TobspressRequestHandler,
  TobsMap,
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

  /** Attaches a non-method specific router that catches all request paths under the given path */
  all(
    path: string,
    ...fn: [...TobspressRequestHandler[], TobspressRouterType]
  ): TobspressRouter {
    if (fn.at(-1) instanceof TobspressRouter) {
      const router = fn.pop();
      this.attachRouter(
        "USE",
        path,
        fn as TobspressRequestHandler[],
        router as TobspressRouterType,
        { catchAll: true }
      );
    } else {
      this.attachRouter(
        "USE",
        path,
        fn as TobspressRequestHandler[],
        undefined,
        { catchAll: true }
      );
    }
    return this;
  }

  /** Attaches a non-method specific router */
  use(
    path: string,
    ...fn: [...TobspressRequestHandler[], TobspressRouterType]
  ): TobspressRouter {
    if (fn.at(-1) instanceof TobspressRouter) {
      const router = fn.pop();
      this.attachRouter(
        "USE",
        path,
        fn as TobspressRequestHandler[],
        router as TobspressRouterType
      );
    } else {
      this.attachRouter(
        "USE",
        path,
        fn as TobspressRequestHandler[],
        undefined
      );
    }
    return this;
  }

  /** Attaches a HTTP POST method router */
  post(
    path: string,
    ...fn: [...TobspressRequestHandler[], TobspressRouterType]
  ): TobspressRouter {
    if (fn.at(-1) instanceof TobspressRouter) {
      const router = fn.pop();
      this.attachRouter(
        Method.POST,
        path,
        fn as TobspressRequestHandler[],
        router as TobspressRouterType
      );
    } else {
      this.attachRouter(
        Method.POST,
        path,
        fn as TobspressRequestHandler[],
        undefined
      );
    }
    return this;
  }

  /** Attaches a HTTP GET method router */
  get(
    path: string,
    ...fn: [...TobspressRequestHandler[], TobspressRouterType]
  ): TobspressRouter {
    if (fn.at(-1) instanceof TobspressRouter) {
      const router = fn.pop();
      this.attachRouter(
        Method.GET,
        path,
        fn as TobspressRequestHandler[],
        router as TobspressRouterType
      );
    } else {
      this.attachRouter(
        Method.GET,
        path,
        fn as TobspressRequestHandler[],
        undefined
      );
    }
    return this;
  }

  /** Attaches a HTTP PUT method router */
  put(
    path: string,
    ...fn: [...TobspressRequestHandler[], TobspressRouterType]
  ): TobspressRouter {
    if (fn.at(-1) instanceof TobspressRouter) {
      const router = fn.pop();
      this.attachRouter(
        Method.PUT,
        path,
        fn as TobspressRequestHandler[],
        router as TobspressRouterType
      );
    } else {
      this.attachRouter(
        Method.PUT,
        path,
        fn as TobspressRequestHandler[],
        undefined
      );
    }
    return this;
  }

  /** Attaches a HTTP DELETE method router */
  delete(
    path: string,
    ...fn: [...TobspressRequestHandler[], TobspressRouterType]
  ): TobspressRouter {
    if (fn.at(-1) instanceof TobspressRouter) {
      const router = fn.pop();
      this.attachRouter(
        Method.DELETE,
        path,
        fn as TobspressRequestHandler[],
        router as TobspressRouterType
      );
    } else {
      this.attachRouter(
        Method.DELETE,
        path,
        fn as TobspressRequestHandler[],
        undefined
      );
    }
    return this;
  }

  private attachRouter(
    method: Method | "USE",
    path: string,
    handlers: TobspressRequestHandler[],
    router: TobspressRouterType | undefined,
    options?: TobspressRouteOptions | undefined
  ) {
    path = sanitizePath(path);
    if (router) {
      // move child routers on "/" path to the parent router
      if (path === "" && router.children) {
        for (const key of router.children) {
          const child = router.children.get(key)!;
          child.middlewares.push(...router.middlewares, ...handlers);
          this.children.set(key, child);
        }
      }
      this.children.set(
        method === "USE" ? { path } : { path, method },
        new TobspressChildRouter(
          router.handler,
          path === "" ? undefined : router.children,
          router.middlewares.concat(handlers),
          options?.catchAll
        )
      );
    } else if (handlers && handlers.length) {
      const lastHandler = handlers.pop();
      this.children.set(
        method === "USE" ? { path } : { path, method },
        new TobspressChildRouter(
          lastHandler,
          undefined,
          handlers,
          options?.catchAll
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
