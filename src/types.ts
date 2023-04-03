import { IncomingMessage, ServerResponse } from "http";
import path from "path";
import fs from "fs/promises";

export type Method = "GET" | "POST";

// TODO: support for reading headers on requests
// support for setting headers on responses
export class TobspressRequest {
  body: Promise<any>;
  constructor(readonly rawRequest: IncomingMessage) {
    this.body = this.parseBody();
  }

  method: Method = this.rawRequest.method === "GET" ? "GET" : "POST";
  url: string = (this.rawRequest.url ?? "").substring(1);

  async parseBody() {
    let raw_body = "";
    // parse chunk emitted from data event as request body
    if (this.rawRequest.method && this.method === "POST") {
      await this.rawRequest.on("data", (chunk) => {
        raw_body += Buffer.from(chunk).toString();
      });
    }

    // parse the raw body into an object
    let body: any;
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

export class TobspressResponse {
  code: number;
  constructor(readonly rawResponse: ServerResponse) {
    this.code = 200;
  }

  status(code: number) {
    this.code = code;
    return this;
  }

  async send(
    data: string | number | object,
    options?: { type: "file" | "path"; extention: string }
  ) {
    if (options && options.type === "file") {
      this.rawResponse.writeHead(this.code, {
        "Content-Type": `${
          mimeType[options.extention] ?? "text/plain"
        }; encoding=utf8`,
      });
      this.rawResponse.write(data);
      this.rawResponse.end();
      return;
    } else if (options && options.type === "path") {
      await fs
        .readFile(
          path.join(
            process.cwd(),
            typeof data === "string" ? data : data.toString()
          ),
          {
            encoding: "utf8",
          }
        )
        .then((data) => {
          new TobspressResponse(this.rawResponse).send(data, {
            type: "file",
            extention: options.extention,
          });
        })
        .catch((_) =>
          new TobspressResponse(this.rawResponse)
            .status(404)
            .send({ error: "NOT FOUND" })
        );
      return;
    }
    this.rawResponse.writeHead(this.code, {
      "Content-Type": "application/json; encoding=utf8",
    });
    this.rawResponse.write(JSON.stringify(data));
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
