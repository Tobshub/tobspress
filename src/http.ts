import { IncomingHttpHeaders, IncomingMessage, ServerResponse } from "http";
import path from "path";
import fs from "fs/promises";
import { tobspressLog } from "./helpers";
import { mimeType } from "./types";
import { gzip } from "zlib";

export const enum Method {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
}

/** Wrapper for `http.IncomingMessage` request */
export class TobspressRequest {
  /**
   * HTTP request body parsed as JSON
   * */
  body: Promise<any>;
  headers: IncomingHttpHeaders;
  method: Method;
  url: string;
  id: number;
  time: number;
  constructor(readonly rawRequest: IncomingMessage) {
    this.body = this.parseBody();
    this.headers = this.rawRequest.headers;
    this.id = parseInt((Math.random() * 100000).toFixed(0));
    this.time = Date.now();
    /**
     * HTTP request method
     * Can only be "GET", "PUT", "DELETE", or "POST"
     * If the request method is not listed above, it will default to a post
     * */
    this.method =
      rawRequest.method === "GET"
        ? Method.GET
        : rawRequest.method === "PUT"
        ? Method.PUT
        : rawRequest.method === "DELETE"
        ? Method.DELETE
        : Method.POST;
    this.url = this.rawRequest.url ?? "/";
  }

  private async parseBody() {
    let raw_body = "";
    // parse chunk emitted from data event as request body
    if (this.method !== Method.GET) {
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
      tobspressLog([this.id], "Error: Could not parse request body", error);
    }
    return body;
  }
}

/** Wrapper for `http.ServerResponse` response */
export class TobspressResponse {
  /**
   * The status code of the HTTP response
   * By default it is 200
   * */
  code: number;
  options: { compressed: boolean; type: string };
  constructor(readonly rawResponse: ServerResponse) {
    this.code = 200;
    this.options = { compressed: false, type: "text/plain" };
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
        // use gzip compression on read file data
        gzip(data, async (_, data) => {
          this.options = {
            compressed: true,
            type: mimeType[file_extension] ?? "text/plain",
          };
          await this._send(data);
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
  async send(data: string | number | object | Buffer) {
    switch (typeof data) {
      case "object": {
        if (Buffer.isBuffer(data)) {
          this.options.type = "application/octet-stream";
        } else {
          this.options.type = "application/json";
        }
        break;
      }
      default: {
        this.options.type = "text/plain";
        break;
      }
    }
    await this._send(data);
  }

  private async _send(data: any) {
    this.rawResponse.writeHead(this.code, {
      "Content-Type": `${this.options.type}; charset=utf8`,
      "Content-Encoding": this.options.compressed ? "gzip" : "utf8",
    });
    this.rawResponse.write(
      this.options.type === "application/json" && !this.options.compressed
        ? JSON.stringify(data)
        : data
    );
    this.rawResponse.end();
  }
}
