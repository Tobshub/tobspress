import { Server, IncomingMessage, ServerResponse, createServer } from "http";
import {
  type TobspressRouterType,
  type TobspressRequestHandler,
  type Method,
  TobsMap,
  TobspressRequest,
  TobspressResponse,
  TobspressRouterFn,
} from "./types";
import path from "path";

/** The Tobspress instance */
export default class Tobspress {
  handler?: TobspressRequestHandler;
  children: TobsMap<{ path: string; method?: Method }, TobspressRouterType>;
  private staticFolderPath: string;
  constructor() {
    this.children = new TobsMap();
    this.handleRequest = this.handleRequest.bind(this);
    this.staticFolderPath = process.cwd();
  }

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
    console.log({ url: request.url });
    let router: TobspressRouterType | undefined = this;
    let searchPath = "";

    if (!url.length) {
      if (router && router.children.has({ path: "" })) {
        router = router.children.get({ path: "" });
      } else if (
        router &&
        router.children.has({ path: "", method: request.method })
      ) {
        router = router.children.get({ path: "", method: request.method });
      }
    } else {
      for (let i = 0; i < url.length; i++) {
        let path = url[i];
        searchPath = searchPath.length ? searchPath.concat("/", path) : path;
        if (router && router.children.has({ path: searchPath })) {
          router = router.children.get({
            path: searchPath,
          }) as TobspressRouterType;
          // reset searchPath
          searchPath = "";
        } else if (
          router &&
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

  use(path: string, fn: TobspressRouterFn): Tobspress {
    this.attachRouter("USE", path, fn);
    return this;
  }

  post(path: string, fn: TobspressRouterFn): Tobspress {
    this.attachRouter("POST", path, fn);
    return this;
  }

  get(path: string, fn: TobspressRouterFn): Tobspress {
    this.attachRouter("GET", path, fn);
    return this;
  }

  put(path: string, fn: TobspressRouterFn): Tobspress {
    this.attachRouter("PUT", path, fn);
    return this;
  }

  delete(path: string, fn: TobspressRouterFn): Tobspress {
    this.attachRouter("DELETE", path, fn);
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
        new TobspressRouter(fn, undefined, method === "USE")
      );
    } else {
      this.children.set(
        method === "USE"
          ? { path: sanitizePath(path) }
          : { path: sanitizePath(path), method },
        new TobspressRouter(fn.handler, fn.router?.children)
      );
    }
  }

  static(folderPath: string) {
    const staticFolder = path.join(process.cwd(), folderPath);
    this.staticFolderPath = staticFolder;
  }
}

export class TobspressRouter implements TobspressRouterType {
  children: TobsMap<{ path: string; method?: Method }, TobspressRouterType>;
  constructor(
    readonly handler?: TobspressRequestHandler,
    children?: TobsMap<{ path: string; method?: Method }, TobspressRouterType>,
    readonly catchAll?: boolean
  ) {
    this.children = children ?? new TobsMap();
  }

  use(path: string, fn: TobspressRouterFn): TobspressRouter {
    this.attachRouter("USE", path, fn);
    return this;
  }

  get(path: string, fn: TobspressRouterFn): TobspressRouter {
    this.attachRouter("GET", path, fn);
    return this;
  }

  post(path: string, fn: TobspressRouterFn): TobspressRouter {
    this.attachRouter("POST", path, fn);
    return this;
  }

  // TODO: implement the following
  put(path: string, fn: TobspressRouterFn): TobspressRouter {
    this.attachRouter("PUT", path, fn);
    return this;
  }

  delete(path: string, fn: TobspressRouterFn): TobspressRouter {
    this.attachRouter("DELETE", path, fn);
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
          : { path: sanitizePath(path), method: "POST" },
        new TobspressRouter(fn, undefined, method === "USE")
      );
    } else {
      this.children.set(
        method === "USE"
          ? { path: sanitizePath(path) }
          : { path: sanitizePath(path), method: "POST" },
        new TobspressRouter(fn.handler, fn.router?.children, method === "USE")
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
