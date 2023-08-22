const { TobspressRouter } = require("../dist/index.js");
const Tobpress = require("../dist/index.js").default;

const app = new Tobpress({ log: false });

app.use("health", (_, res) => {
  res.send("I am healthy");
});

const apiRouter = new TobspressRouter();
apiRouter.get(
  "/",
  (_, res, next) => {
    res.setHeader("middleware-active", "true");
    next();
  },
  (_, res) => res.send("API ROUTE")
);
apiRouter.post("/", async (req, res) => res.send(await req.body));

apiRouter.post("/form-urlencoded", async (req, res) =>
  res.send(await req.body)
);

apiRouter.get("/query", async (req, res) => res.send(req.query));

const deeperApiRouter = new TobspressRouter();

deeperApiRouter.all("/", (_, res) => res.send("DEEP"));

apiRouter.all(
  "/all",
  (_, res, next) => {
    res.setHeader("middleware-active", "true");
    next();
  },
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

exports.app = app;
