import { Server, IncomingMessage, ServerResponse, createServer } from "http";
import {
  type TobspressRouterType,
  type TobspressRequestHandler,
  Method,
  TobsMap,
  TobspressRequest,
  TobspressResponse,
  type TobspressRouterFn,
} from "./types";
import path from "path";

// export types that might me useful in API implementation
export { Method, TobspressRequest, TobspressResponse, type TobspressRouterFn };

/** The Tobspress instance */
class Tobspress {
  handler?: TobspressRequestHandler;
  children: TobsMap<{ path: string; method?: Method }, TobspressRouterType>;
  /** The path to the folder to look for static files in */
  private staticFolderPath: string;
  private middlewares: ((
    req: TobspressRequest,
    res: TobspressResponse
  ) => Promise<void> | void)[];
  constructor() {
    this.children = new TobsMap();
    this.handleRequest = this.handleRequest.bind(this);
    this.staticFolderPath = process.cwd();
    this.middlewares = [];
  }

  /** Listens on `port` for http requests */
  listen(port: number, callBack?: () => any) {
    this.init().listen(port, callBack);
  }

  private init(): Server {
    return createServer(this.handleRequest);
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    // transform `req` & `res` to their Tobspress counterparts
    const request = new TobspressRequest(req);
    const response = new TobspressResponse(res);
    // search for the req path in `this.routers`
    const url = splitPath(request.url);

    let router: TobspressRouterType | undefined = this;
    let searchPath = "";

    if (!url.length) {
      if (router && router.children && router.children.has({ path: "" })) {
        router = router.children.get({ path: "" });
      } else if (
        router &&
        router.children &&
        router.children.has({ path: "", method: request.method })
      ) {
        router = router.children.get({ path: "", method: request.method });
      }
    } else {
      for (let i = 0; i < url.length; i++) {
        let path = url[i];
        searchPath = searchPath.length ? searchPath.concat("/", path) : path;
        if (
          router &&
          router.children &&
          router.children.has({ path: searchPath })
        ) {
          router = router.children.get({
            path: searchPath,
          }) as TobspressRouterType;
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
          }) as TobspressRouterType;
          // reset searchPath
          searchPath = "";
        } else if (i === url.length - 1 && !router?.catchAll) {
          router = undefined;
        }
      }
    }

    if (router && router.handler) {
      await router.handler(request, response);
      return;
    }

    // as a last resort, treat the url as a static file path
    const foundFile = await response.sendFile(
      path.join(this.staticFolderPath, request.url)
    );

    if (foundFile) return;

    // return 404 if no handler or file is found
    response.status(404).send({ error: "NOT FOUND" });
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
        new TobspressChildRouter(fn, undefined, method === "USE")
      );
    } else {
      this.children.set(
        method === "USE"
          ? { path: sanitizePath(path) }
          : { path: sanitizePath(path), method },
        new TobspressChildRouter(fn.handler, fn.router?.children)
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
}

export default Tobspress;

/** Router interface that is initialized with its handlers and children */
class TobspressChildRouter implements TobspressRouterType {
  constructor(
    public readonly handler?: TobspressRequestHandler,
    public readonly children?: TobsMap<
      { path: string; method?: Method },
      TobspressRouterType
    >,
    /** Whether the router should catch child paths that are not defined */
    public readonly catchAll?: boolean
  ) {}
}

/** Router to handle HTTP requests */
export class TobspressRouter implements TobspressRouterType {
  children: TobsMap<{ path: string; method?: Method }, TobspressRouterType>;
  constructor() {
    this.children = new TobsMap();
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
        new TobspressChildRouter(fn, undefined, method === "USE")
      );
    } else {
      this.children.set(
        method === "USE"
          ? { path: sanitizePath(path) }
          : { path: sanitizePath(path), method },
        new TobspressChildRouter(
          fn.handler,
          fn.router?.children,
          method === "USE"
        )
      );
    }
  }
}

function splitPath(path: string) {
  let split = path.split("/");
  return split.filter((path) => path !== "");
}

function sanitizePath(path: string) {
  return splitPath(path).join("/");
}
