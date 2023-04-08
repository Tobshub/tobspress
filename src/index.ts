import { Server, IncomingMessage, ServerResponse, createServer } from "http";
import {
  type TobspressRouterType,
  type TobspressRequestHandler,
  type Method,
  TobsMap,
  TobspressRequest,
  TobspressResponse,
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

  use(
    path: string,
    fn: { router?: TobspressRouterType; handler?: TobspressRequestHandler }
  ): Tobspress {
    this.children.set(
      { path: sanitizePath(path) },
      new TobspressRouter(fn.handler, fn.router?.children, true)
    );
    return this;
  }

  post(
    path: string,
    fn: { router?: TobspressRouterType; handler?: TobspressRequestHandler }
  ): Tobspress {
    this.children.set(
      { path: sanitizePath(path), method: "POST" },
      new TobspressRouter(fn.handler, fn.router?.children)
    );
    return this;
  }

  // TODO: implement the following
  put(path: string, fn: {}) {}

  delete(path: string, fn: {}) {}

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

  use(
    path: string,
    fn: { router?: TobspressRouterType; handler?: TobspressRequestHandler }
  ): TobspressRouter {
    this.children.set(
      { path: sanitizePath(path) },
      new TobspressRouter(fn.handler, fn.router?.children, true)
    );
    return this;
  }

  get(
    path: string,
    fn: { handler?: TobspressRequestHandler; router?: TobspressRouterType }
  ): TobspressRouter {
    this.children.set(
      { path: sanitizePath(path), method: "GET" },
      new TobspressRouter(fn.handler, fn.router?.children)
    );
    return this;
  }

  post(
    path: string,
    fn: { handler?: TobspressRequestHandler; router?: TobspressRouterType }
  ): TobspressRouter {
    this.children.set(
      { path: sanitizePath(path), method: "POST" },
      new TobspressRouter(fn.handler, fn.router?.children)
    );
    return this;
  }

  // TODO: implement the following
  put(path: string, fn: {}) {}

  delete(path: string, fn: {}) {}
}

function splitPath(path: string) {
  let split = path.split("/");
  return split.filter((path) => path !== "");
}

function sanitizePath(path: string) {
  return splitPath(path).join("/");
}
