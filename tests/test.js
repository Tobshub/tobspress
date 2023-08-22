const test = require("node:test");
const assert = require("assert");
const { TobspressRouter } = require("../dist/index.js");
const Tobpress = require("../dist/index.js").default;

const app = new Tobpress({ log: false });

app.use("health", (_, res) => {
  res.send("I am healthy");
});

const apiRouter = new TobspressRouter();
apiRouter.get(
  "/",
  (_, res) => res.setHeader("middleware-active", "true"),
  (_, res) => res.send("API ROUTE")
);
apiRouter.post("/", async (req, res) => res.send(await req.body));

const deeperApiRouter = new TobspressRouter();

deeperApiRouter.all("/", (_, res) => res.send("DEEP"));

apiRouter.all(
  "/all",
  (_, res) => res.setHeader("middleware-active", "true"),
  deeperApiRouter
);

app.use("/api", apiRouter);

app.all("/echo", (req, res) => {
  const url = req.url.split("/").filter((path) => path !== "");
  // remove echo from the text
  url.shift();
  if (url.length) {
    const message = url.join(" ").replace(/(%20)|\+/g, " ");
    if (message.toLowerCase() === "hello world") {
      res.send("Come on! That's too easy.");
    } else {
      res.send(message);
    }
  } else {
    res.send(
      "Add words to the url to make it say stuff. E.g. /echo/hello/world"
    );
  }
});

const PORT = 4000;
app.listen(PORT);

const API_URL = `http://localhost:${PORT}`;

test("API Testing", async (t) => {
  await t.test("/health", async () => {
    const res = await fetch(API_URL + "/health");
    const text = await res.text();
    assert.strictEqual("I am healthy", text, "Health call Failed");
  });

  await t.test("GET /api but with child router on '/'", async () => {
    const res = await fetch(API_URL + "/api");
    const text = await res.text();
    const middlewareActive = res.headers.get("middleware-active");

    assert.strictEqual(middlewareActive, "true");
    assert.strictEqual("API ROUTE", text);
  });

  await t.test("POST /api but with child router on '/'", async () => {
    const reqBody = { hello: "WORLD", time: Date.now() };
    const res = await fetch(API_URL + "/api", {
      method: "POST",
      body: JSON.stringify(reqBody),
    });
    const resBody = await res.json();
    assert.deepStrictEqual(reqBody, resBody);
  });

  await t.test("ALL /api/all", async () => {
    const res = await fetch(API_URL + "/api/all");
    const text = await res.text();
    const middlewareActive = res.headers.get("middleware-active");

    assert.strictEqual(middlewareActive, "true");
    assert.deepStrictEqual(text, "DEEP");
  });

  await t.test("/echo/hello/world", async () => {
    const res = await fetch(API_URL + "/echo/hello/world");
    const message = await res.text();
    assert.strictEqual("Come on! That's too easy.", message);
  });

  await t.test("/echo/I/am/here", async () => {
    const res = await fetch(API_URL + "/echo/I/am/here");
    const message = await res.text();
    assert.strictEqual("I am here", message);
  });

  await t.test("/package.json", async () => {
    const res = await fetch(API_URL + "/package.json");
    const text = await res.text();

    assert.strictEqual(res.status, 200);
  });
});
