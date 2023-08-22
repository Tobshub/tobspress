import { Server, IncomingMessage, ServerResponse, createServer } from "http";
import path from "path";
import { splitPath, sanitizePath, tobspressLog } from "./helpers";
import { TobspressChildRouter, TobspressRouter } from "./router";
import {
  type TobspressRouterType,
  type TobspressRequestHandler,
  TobsMap,
  type TobspressOptions,
  TobspressRouteOptions,
} from "./types";
import { Method, TobspressRequest, TobspressResponse } from "./http";

// export types that might me useful in API implementation
export {
  Method,
  TobspressRequest,
  TobspressResponse,
  TobspressRouter,
  type TobspressOptions,
};
/** The Tobspress instance */
class Tobspress {
  children: TobsMap<{ path: string; method?: Method }, TobspressRouterType>;
  /** The path to the folder to look for static files in */
  private staticFolderPath: string;
  middlewares: TobspressRequestHandler[];
  constructor(private readonly options?: TobspressOptions) {
    this.children = new TobsMap();
    this.staticFolderPath = process.cwd();
    this.middlewares = [];

    this.listen = this.listen.bind(this);
    this.all = this.all.bind(this);
    this.use = this.use.bind(this);
    this.post = this.post.bind(this);
    this.get = this.get.bind(this);
    this.delete = this.delete.bind(this);
    this.put = this.put.bind(this);
  }

  /** Listens on `port` for http requests */
  listen(port: number, callBack?: () => any) {
    this.init().listen(port, callBack);
    this.log("Listening on port", port);
  }

  /** Optional Logger, Logs if options.log is `true` */
  private log(...args: any) {
    if (this.options?.log) {
      tobspressLog(...args);
    }
  }

  private init(): Server {
    this.log("Starting App...");
    return createServer(this.handleRequest);
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    // transform `req` & `res` to their Tobspress counterparts
    const request = new TobspressRequest(req);
    const response = new TobspressResponse(res);
    // search for the req path in `this.routers`
    const url = splitPath(request.url.substring(1));

    let router: TobspressRouterType | undefined = this;
    const routeMiddlewares = [...this.middlewares];
    let searchPath = "";

    if (!url.length) {
      if (router && router.children && router.children.has({ path: "" })) {
        router = router.children.get({ path: "" });
        if (router) routeMiddlewares.push(...router.middlewares);
      } else if (
        router &&
        router.children &&
        router.children.has({ path: "", method: request.method })
      ) {
        router = router.children.get({ path: "", method: request.method });
        if (router) routeMiddlewares.push(...router.middlewares);
      }
    } else {
      url.forEach((path, i) => {
        searchPath = searchPath.length ? searchPath.concat("/", path) : path;
        if (
          router &&
          router.children &&
          router.children.has({ path: searchPath })
        ) {
          router = router.children.get({ path: searchPath });
          // reset searchPath
          searchPath = "";
        } else if (
          router &&
          router.children &&
          router.children.has({ path: searchPath, method: request.method })
        ) {
          router = router.children.get({
            path: searchPath,
            method: request.method,
          });
          // reset searchPath
          searchPath = "";
        } else if (i === url.length - 1 && !router?.catchAll) {
          router = undefined;
        }
        if (router) routeMiddlewares.push(...router.middlewares);
      });
    }

    await this.callHandler(router, request, response, routeMiddlewares);

    if (this.options?.log) {
      request.log(
        request.method,
        request.url,
        "| done in:",
        (Date.now() - request.time) / 1000,
        "| status:",
        response.code
      );
    }
  }

  private async callHandler(
    router: TobspressRouterType | undefined,
    request: TobspressRequest,
    response: TobspressResponse,
    routeMiddlewares: TobspressRequestHandler[]
  ) {
    if (router && router.handler) {
      // router middlewares have already been added
      let continueCall = true;
      const next = () => {
        continueCall = true;
      };
      routeMiddlewares.forEach((fn) => {
        if (continueCall) {
          continueCall = false;
          fn(request, response, next);
        }
      });
      if (continueCall) {
        await router.handler(request, response, next);
      }
    } else if (
      router &&
      router.children &&
      (router.children.has({ path: "" }) ||
        router.children.has({ path: "", method: request.method }))
    ) {
      // attempt to use child router on path "/" if router found but no handler
      router =
        router.children.get({ path: "" }) ??
        router.children.get({ path: "", method: request.method });
      if (router) {
        this.callHandler(
          router,
          request,
          response,
          routeMiddlewares.concat(router.middlewares)
        );
      }
    }
    // as a last resort, treat the url as a static file path
    else if (
      await response.sendFile(path.join(this.staticFolderPath, request.url))
    ) {
    } else {
      // return 404 if no handler or file is found
      response.status(404).send({ error: "NOT FOUND", url: request.url });
    }
  }

  /** Attaches a non-method specific router that catches all request paths under the given path */
  all(
    path: string,
    ...fn: [...TobspressRequestHandler[], TobspressRouterType]
  ): Tobspress {
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
  ): Tobspress {
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
  ): Tobspress {
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
  ): Tobspress {
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
  ): Tobspress {
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
  ): Tobspress {
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
      this.children.set(
        method === "USE" ? { path } : { path, method },
        new TobspressChildRouter(
          router.handler,
          router.children,
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

  /**
   * Sets the path to look for static files
   * The path name is appended to `process.cwd()`
   * */
  static(folderPath: string) {
    const staticFolder = path.join(process.cwd(), folderPath);
    this.staticFolderPath = staticFolder;
  }

  /** Attach middleware that runs on every request before it's router code if any  */
  attach(middlewares: TobspressRequestHandler[]) {
    this.middlewares.push(...middlewares);
  }
}

export default Tobspress;
