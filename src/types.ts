import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import path from "path";
import fs from "fs/promises";

export type Method = "GET" | "POST" | "PUT" | "DELETE";

/** Wrapper for `http.IncomingMessage` request */
export class TobspressRequest {
  /**
   * HTTP request body parsed as JSON
   * */
  body: Promise<any>;
  headers: IncomingHttpHeaders;
  method: Method;
  url: string;
  constructor(readonly rawRequest: IncomingMessage) {
    this.body = this.parseBody();
    this.headers = this.rawRequest.headers;
    /**
     * HTTP request method
     * Can only be "GET", "PUT", "DELETE", or "POST"
     * If the request method is not listed above, it will default to a post
     * */
    this.method =
      rawRequest.method === "GET"
        ? "GET"
        : rawRequest.method === "PUT"
        ? "PUT"
        : rawRequest.method === "DELETE"
        ? "DELETE"
        : "POST";
    this.url = this.rawRequest.url?.substring(1) ?? "";
  }


  async parseBody() {
    let raw_body = "";
    // parse chunk emitted from data event as request body
    if (this.method === "POST") {
      await this.rawRequest.on("data", (chunk) => {
        raw_body += Buffer.from(chunk).toString();
      });
    }

    // parse the raw body into an object
    let body: any = undefined;
    try {
      body = raw_body ? JSON.parse(raw_body) : null;
    } catch (error) {
      // not json
      console.error("Error: Could not parse request body", error);
    }
    return body;
  }
}

const mimeType: { [key: string]: string } = {
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

/** Wrapper for `http.ServerResponse` response */
export class TobspressResponse {
  /**
   * The status code of the HTTP response
   * By default it is 200
   * */
  code: number;
  constructor(readonly rawResponse: ServerResponse) {
    this.code = 200;
  }

  /**
   * Takes a valid HTTP status code and sets it on the HTTP response
   * */
  status(code: number) {
    this.code = code;
    return this;
  }

  setHeader(
    name: string,
    value: string | number | string[]
  ): TobspressResponse {
    this.rawResponse.setHeader(name, value);
    return this;
  }

  removeHeader(name: string): TobspressResponse {
    this.rawResponse.removeHeader(name);
    return this;
  }

  /**
   * Sends file at `file_path` as HTTP response
   * @returns false if the file is not found
   * */
  async sendFile(file_path: string) {
    const ext_start = file_path.lastIndexOf(".");
    const file_extension = file_path.slice(ext_start < 0 ? 0 : ext_start);
    // `path.resolve` here helps avoid some issues
    const abs_path = path.resolve(process.cwd(), file_path);
    const res = await fs
      .readFile(abs_path, {
        encoding: "utf8",
      })
      .then((data) => {
        this.send(data, {
          type: mimeType[file_extension] ?? "text/plain",
        });
        return true;
      })
      .catch((_) => false);
    return res;
  }

  /**
   * Sends arbritrary data as the HTTP response
   * By default it attempts to JSON serialize the data
   * */
  async send(data: string | number | object, options?: { type?: string }) {
    this.rawResponse.writeHead(this.code, {
      "Content-Type": `${options?.type ?? "application/json"}; encoding=utf8`,
    });
    this.rawResponse.write(
      options?.type === "application/json" || !options?.type
        ? JSON.stringify(data)
        : data
    );
    this.rawResponse.end();
  }
}

export type TobspressRequestHandler = (
  req: TobspressRequest,
  res: TobspressResponse
) => Promise<any>;

export type TobspressRouterType = {
  handler?: TobspressRequestHandler;
  children: TobsMap<{ path: string; method?: Method }, TobspressRouterType>;
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
