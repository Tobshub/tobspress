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

export type TobspressRouteOptions = { catchAll?: boolean };

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

  private serialize(item: any) {
    if (item && typeof item === "object") {
      const keys = Object.keys(item);
      let serializedString = "";
      for (const key of keys) {
        serializedString += `[${key}=${item[key]}]`;
      }
      return serializedString;
    } else {
      return item;
    }
  }

  get(key: Key) {
    return this.map.get(this.serialize(key));
  }

  set(key: Key, value: Value) {
    this.map.set(this.serialize(key), value);
    return key;
  }

  has(key: Key) {
    return this.map.has(this.serialize(key));
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
