import { Method, TobspressRequest, TobspressResponse } from "./http";

export type TobspressOptions = {
  /** Use built-in request logging */
  log?: boolean;
  /**
   * Prevent child routers handling requests for their parent
   *
   * With `strictRouting` set to `true`, child routers set to "/" have no effect
   * */
  strictRouting?: boolean;
};

export const mimeType: { [key: string]: string } = {
  ".ico": "image/x-icon",
  ".html": "text/html",
  ".js": "text/javascript",
  ".json": "application/json",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".wav": "audio/wav",
  ".mp3": "audio/mpeg",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".doc": "application/msword",
  ".eot": "application/vnd.ms-fontobject",
  ".ttf": "application/x-font-ttf",
};

export type TobspressRequestHandler = (
  req: TobspressRequest,
  res: TobspressResponse
) => Promise<void> | void;

export type TobspressRouterType = {
  handler?: TobspressRequestHandler;
  children?: TobsMap<{ path: string; method?: Method }, TobspressRouterType>;
  middlewares: TobspressRequestHandler[];
  catchAll?: boolean;
};

export class TobsMap<Key, Value> {
  map: Map<string, Value>;
  constructor() {
    this.map = new Map();
  }

  get(key: Key) {
    return this.map.get(JSON.stringify(key));
  }

  set(key: Key, value: Value): TobsMap<Key, Value> {
    this.map.set(JSON.stringify(key), value);
    return this;
  }

  has(key: Key) {
    return this.map.has(JSON.stringify(key));
  }

  [Symbol.iterator]() {
    return this.map.keys;
  }

  size() {
    return this.map.size;
  }
}

export type TobspressRouterFn =
  | TobspressRequestHandler
  | { handler?: TobspressRequestHandler; router?: TobspressRouterType };
