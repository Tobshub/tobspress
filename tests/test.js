const test = require("node:test");
const assert = require("assert");
const { app } = require("./setup.js");

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

  await t.test("POST with form-urlencoded body", async () => {
    const reqBody = { hello: "WORLD", time: Date.now().toString() };
    const res = await fetch(API_URL + "/api/form-urlencoded", {
      method: "POST",
      body: new URLSearchParams(reqBody).toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    const resBody = await res.json();
    assert.deepStrictEqual(reqBody, resBody);
  });

  await t.test("ALL /api/all", async () => {
    const res = await fetch(API_URL + "/api/all");
    const text = await res.text();
    const middlewareActive = res.headers.get("middleware-active");

    assert.strictEqual(middlewareActive, "true");
    assert.strictEqual(text, "DEEP");
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

  await t.test("URL Query", async () => {
    const searchParams = { hello: "WORLD", time: Date.now().toString() };
    const res = await fetch(
      API_URL + "/api/query?" + new URLSearchParams(searchParams).toString()
    );
    const resBody = await res.json();

    assert.deepStrictEqual(searchParams, resBody);
  });
});
