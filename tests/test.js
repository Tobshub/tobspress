const test = require("node:test");
const assert = require("assert");
const { TobspressRouter } = require("../dist/index.js");
const Tobpress = require("../dist/index.js").default;

const app = new Tobpress({ log: true });

app.use("health", (_, res) => {
  res.send("I am healthy");
});

const apiRouter = new TobspressRouter();
apiRouter.get("/", (_, res) => res.send("API ROUTE"));
apiRouter.post("/", async (req, res) => res.send(await req.body));
app.use("/api", { router: apiRouter });

app.use(
  "/echo",
  (req, res) => {
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
  },
  { catchAll: true }
);

app.listen(4000);

const API_URL = "http://localhost:4000";
test("API Testing", async (t) => {
  await t.test("/health", async () => {
    const res = await fetch(API_URL + "/health");
    const text = await res.text();
    assert.strictEqual("I am healthy", text, "Health call Failed");
  });

  await t.test("GET /api but with child router on '/'", async () => {
    const res = await fetch(API_URL + "/api");
    const text = await res.text();
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
});
