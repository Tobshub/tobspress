import { Server, IncomingMessage, ServerResponse, createServer } from "http";
import path from "path";
import { splitPath, sanitizePath, tobspressLog } from "./helpers";
import { TobspressChildRouter, TobspressRouter } from "./router";
import {
  type TobspressRouterType,
  type TobspressRequestHandler,
  TobsMap,
  type TobspressRouterFn,
  type TobspressOptions,
} from "./types";
import { Method, TobspressRequest, TobspressResponse } from "./http";

// export types that might me useful in API implementation
export { Method, TobspressRequest, TobspressResponse, type TobspressRouterFn, TobspressRouter, type TobspressOptions };
// TODO: generate random id for each request
/** The Tobspress instance */
class Tobspress {
  handler?: TobspressRequestHandler;
  children: TobsMap<{ path: string; method?: Method }, TobspressRouterType>;
  /** The path to the folder to look for static files in */
  private staticFolderPath: string;
  middlewares: TobspressRequestHandler[];
  constructor(private readonly options?: TobspressOptions) {
    this.children = new TobsMap();
    this.handleRequest = this.handleRequest.bind(this);
    this.staticFolderPath = process.cwd();
    this.middlewares = [];
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
    this.log([request.id], request.method, request.url);
    // search for the req path in `this.routers`
    const url = splitPath(request.url.substring(1));

    let router: TobspressRouterType | undefined = this;
    const routeMiddlewares = this.middlewares;
    let searchPath = "";

    if (!url.length) {
      if (router && router.children && router.children.has({ path: "" })) {
        router = router.children.get({ path: "" });
      } else if (router && router.children && router.children.has({ path: "", method: request.method })) {
        router = router.children.get({ path: "", method: request.method });
      }
    } else {
      url.forEach((path, i) => {
        searchPath = searchPath.length ? searchPath.concat("/", path) : path;
        if (router && router.children && router.children.has({ path: searchPath })) {
          router = router.children.get({ path: searchPath });
          // reset searchPath
          searchPath = "";
        } else if (router && router.children && router.children.has({ path: searchPath, method: request.method })) {
          router = router.children.get({ path: searchPath, method: request.method });
          // reset searchPath
          searchPath = "";
        } else if (i === url.length - 1 && !router?.catchAll) {
          router = undefined;
        }
        if (router) routeMiddlewares.push(...router.middlewares);
      });
    }

    // call middlewares
    routeMiddlewares.forEach((fn) => fn(request, response));

    await this.callHandler(router, request, response);

    this.log([request.id], "Done in", (Date.now() - request.time) / 1000, "status:", response.code);
  }

  private async callHandler(
    router: TobspressRouterType | undefined,
    request: TobspressRequest,
    response: TobspressResponse
  ) {
    if (router && router.handler) {
      await router.handler(request, response);
    } else if (
      router &&
      router.children &&
      (router.children.has({ path: "" }) || router.children.has({ path: "", method: request.method }))
    ) {
      // attempt to use child router on path "/" if router found but no handler
      const handler =
        router.children.get({ path: "" })?.handler ??
        router.children.get({ path: "", method: request.method })?.handler;
      if (handler) {
        await handler(request, response);
        return;
      }
    }
    // as a last resort, treat the url as a static file path
    else if (await response.sendFile(path.join(this.staticFolderPath, request.url))) {
    } else {
      // return 404 if no handler or file is found
      response.status(404).send({ error: "NOT FOUND" });
    }
  }

  /** Attaches a non-method specific router */
  use(path: string, fn: TobspressRouterFn): Tobspress {
    this.attachRouter("USE", path, fn);
    return this;
  }

  /** Attaches a HTTP POST method router */
  post(path: string, fn: TobspressRouterFn): Tobspress {
    this.attachRouter(Method.POST, path, fn);
    return this;
  }

  /** Attaches a HTTP GET method router */
  get(path: string, fn: TobspressRouterFn): Tobspress {
    this.attachRouter(Method.GET, path, fn);
    return this;
  }

  /** Attaches a HTTP PUT method router */
  put(path: string, fn: TobspressRouterFn): Tobspress {
    this.attachRouter(Method.PUT, path, fn);
    return this;
  }

  /** Attaches a HTTP DELETE method router */
  delete(path: string, fn: TobspressRouterFn): Tobspress {
    this.attachRouter(Method.DELETE, path, fn);
    return this;
  }

  private attachRouter(method: Method | "USE", path: string, fn: TobspressRouterFn) {
    if (typeof fn === "function") {
      this.children.set(
        method === "USE" ? { path: sanitizePath(path) } : { path: sanitizePath(path), method },
        new TobspressChildRouter(fn, undefined, [], method === "USE")
      );
    } else {
      this.children.set(
        method === "USE" ? { path: sanitizePath(path) } : { path: sanitizePath(path), method },
        new TobspressChildRouter(fn.handler, fn.router?.children, fn.router?.middlewares)
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

  // TODO:
  /** Attach middleware that runs on every request before it's router code if any  */
  attach(middlewares: TobspressRequestHandler[]) {
    this.middlewares.push(...middlewares);
  }
}

export default Tobspress;
